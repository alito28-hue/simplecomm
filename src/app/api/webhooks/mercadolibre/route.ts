import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GATEWAY_URL     = process.env.GATEWAY_URL     ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';

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

    // Emitir factura via Gateway
    const gatewayRes = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        idempotency_key: `mercadolibre:order:${orderId}`,
        invoice: {
          total_amount:   totalAmount,
          invoice_letter: letter,
          concept:        1,
          description:    `Venta ML #${orderId}`,
          // Para Factura A el total_amount es el NETO — ML ya incluye IVA en el precio,
          // por lo que para A necesitamos dividir. ML informa si es B2B en los metadatos.
          // TODO: confirmar con cada cliente si sus ventas de ML son B2B o B2C
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
