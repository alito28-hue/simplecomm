import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { checkAndIncrementUsage } from '@/lib/usage';
import { processIncomingOrder, type OrderLineItem } from '@/lib/order-processing';

/**
 * Detecta el tipo de factura según:
 * - Condición fiscal del VENDEDOR (tenant): si es monotributista → siempre C
 * - Datos del COMPRADOR en la orden de ML:
 *     · CUIT en billing_info → presume Responsable Inscripto → Factura A
 *     · DNI o sin datos → Consumidor Final → Factura B
 */
function detectInvoiceType(
  sellerFiscalTreatment: string,
  buyerDocType: string | null,
  buyerDocNumber: string | null
): { letter: 'A' | 'B' | 'C'; docType: string; docNumber: string } {

  // Vendedor monotributista → siempre C
  if (sellerFiscalTreatment === 'MONOTRIBUTISTA') {
    return { letter: 'C', docType: buyerDocType ?? 'CONSUMIDOR_FINAL', docNumber: buyerDocNumber ?? '0' };
  }

  // Comprador con CUIT → Responsable Inscripto → Factura A
  if (buyerDocType === 'CUIT' && buyerDocNumber && buyerDocNumber !== '0') {
    return { letter: 'A', docType: 'CUIT', docNumber: buyerDocNumber };
  }

  // Comprador con DNI identificado → Factura B identificada
  if (buyerDocType === 'DNI' && buyerDocNumber && buyerDocNumber !== '0') {
    return { letter: 'B', docType: 'DNI', docNumber: buyerDocNumber };
  }

  // Default: Consumidor Final → Factura B
  return { letter: 'B', docType: 'CONSUMIDOR_FINAL', docNumber: '0' };
}

export async function POST(req: NextRequest) {
  let body: { resource?: string; topic?: string; user_id?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  if (body.topic !== 'orders_v2' && body.topic !== 'orders') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const orderId = body.resource?.split('/').pop();
  if (!orderId) return NextResponse.json({ ok: true });

  const mlUserId = String(body.user_id ?? '');

  // Buscar integración y datos del vendedor
  const supabase = await createClient();
  const { data: integration } = await supabase
    .from('integrations')
    .select('accessToken, organizationId')
    .eq('platform', 'MERCADO_LIBRE')
    .eq('status', 'CONNECTED')
    .maybeSingle();

  if (!integration?.accessToken) {
    console.error(`[ML webhook] Sin integración para ML user ${mlUserId}`);
    return NextResponse.json({ ok: true });
  }

  // Obtener condición fiscal del vendedor
  const { data: org } = await supabase
    .from('organizations')
    .select('fiscalTreatment')
    .eq('id', integration.organizationId)
    .maybeSingle();

  const sellerFiscalTreatment = org?.fiscalTreatment ?? 'RESPONSABLE_INSCRIPTO';

  try {
    // Obtener detalles de la orden desde ML
    const orderRes = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${integration.accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!orderRes.ok) {
      console.error(`[ML webhook] Error obteniendo orden ${orderId}: ${orderRes.status}`);
      return NextResponse.json({ ok: true });
    }

    const order = await orderRes.json();

    // Solo órdenes pagadas
    if (order.status !== 'paid') {
      return NextResponse.json({ ok: true, skipped: `status: ${order.status}` });
    }

    const totalAmount = order.total_amount ?? 0;
    const buyer = order.buyer ?? {};
    const billingInfo = order.billing_info ?? {};

    // Datos del comprador para determinar tipo de factura
    const buyerDocType   = billingInfo.doc_type ?? null;    // "CUIT", "DNI", null
    const buyerDocNumber = billingInfo.doc_number ?? null;  // "30-12345678-9", null
    const buyerName = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || 'Consumidor Final';

    const { letter, docType, docNumber } = detectInvoiceType(
      sellerFiscalTreatment,
      buyerDocType,
      buyerDocNumber
    );

    console.log(`[ML webhook] Orden ${orderId} → Factura ${letter} | Comprador: ${buyerName} | Doc: ${docType} ${docNumber}`);

    // ⚠️ Estructura de order_items sin verificar contra la doc oficial de ML (no pude acceder
    // al momento de escribir esto) — usa el shape más común documentado en la comunidad
    // (order.order_items[].item.seller_sku/id/title, .quantity, .unit_price). Verificar con un
    // pedido real antes de confiar en el match de stock; si el shape no coincide, sku queda
    // null y simplemente no se matchea ningún producto (no rompe la emisión de factura).
    const lineItems: OrderLineItem[] = ((order.order_items as Record<string, unknown>[]) ?? []).map(oi => {
      const item = (oi.item as Record<string, unknown>) ?? {};
      return {
        sku: (item.seller_sku as string) || (item.seller_custom_field as string) || null,
        name: String(item.title ?? ''),
        quantity: Number(oi.quantity ?? 1),
        unitPrice: Number(oi.unit_price ?? 0),
      };
    });
    const orderResult = await processIncomingOrder(
      integration.organizationId,
      'mercadolibre',
      String(orderId),
      {
        businessName: buyerName,
        docType: docType,
        docNumber: docNumber,
        email: buyer.email || null,
        phone: null,
      },
      lineItems,
    );
    if (orderResult.productsCreated.length) {
      console.log(`[ML webhook] ${orderResult.productsCreated.length} producto(s) nuevo(s) creado(s) para revisión desde la orden ${orderId}.`);
    }

    /**
     * Conversión de monto según tipo de factura:
     *
     * ML siempre envía total_amount = precio BRUTO (IVA incluido).
     *
     * Factura B → Gateway espera bruto (él descuenta IVA internamente y no lo discrimina)
     * Factura A → Gateway espera NETO (él agrega IVA encima y lo discrimina)
     * Factura C → Sin IVA, el bruto = neto
     *
     * Para A: neto = bruto / 1.21  (asumimos 21% — el más común en ML)
     */
    const IVA_RATE = 0.21;
    const amountForGateway = letter === 'A'
      ? Math.round((totalAmount / (1 + IVA_RATE)) * 100) / 100
      : totalAmount;

    const usageCheck = await checkAndIncrementUsage(integration.organizationId);
    if (!usageCheck.allowed) {
      console.warn(`[ML webhook] Límite de plan alcanzado para org ${integration.organizationId}: ${usageCheck.reason}`);
      return NextResponse.json({ ok: true, skipped: 'plan_limit' });
    }

    const gatewayApiKey = await getGatewayKey(integration.organizationId);
    const gatewayRes = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayApiKey}`,
      },
      body: JSON.stringify({
        idempotency_key: `mercadolibre:order:${orderId}`,
        invoice: {
          total_amount:   amountForGateway,
          invoice_letter: letter,
          concept:        1,
          description:    `Venta ML #${orderId}`,
        },
        buyer: {
          full_name:  buyerName,
          doc_type:   docType,
          doc_number: docNumber,
          email:      buyer.email,
        },
        source_app:   'mercadolibre',
        external_ref: String(orderId),
        metadata: {
          mlOrderId:  orderId,
          mlUserId,
          invoice_letter: letter,
          clientId: orderResult.clientId,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const invoiceData = await gatewayRes.json();

    if (gatewayRes.ok) {
      console.log(`[ML webhook] ✅ Factura ${letter} emitida — ${invoiceData.invoice_number} | CAE: ${invoiceData.cae}`);
    } else {
      console.error(`[ML webhook] ❌ Error: ${invoiceData.error}`);
    }

  } catch (err) {
    console.error(`[ML webhook] Error procesando orden ${orderId}:`, err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
