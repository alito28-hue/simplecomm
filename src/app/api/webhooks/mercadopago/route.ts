import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { checkAndIncrementUsage } from '@/lib/usage';
import { registrarVentaItem } from '@/lib/venta-items';

/**
 * Detecta tipo de factura igual que en ML:
 * - Vendedor monotributista → C
 * - Comprador con CUIT → A (bruto viene con IVA incluido, se calcula neto)
 * - Comprador con DNI identificado → B
 * - Sin datos → B consumidor final
 */
function detectInvoiceType(
  sellerFiscalTreatment: string,
  buyerDocType: string | null,
  buyerDocNumber: string | null
): { letter: 'A' | 'B' | 'C'; docType: string; docNumber: string } {
  if (sellerFiscalTreatment === 'MONOTRIBUTISTA') {
    return { letter: 'C', docType: buyerDocType ?? 'CONSUMIDOR_FINAL', docNumber: buyerDocNumber ?? '0' };
  }
  if (buyerDocType === 'CUIT' && buyerDocNumber && buyerDocNumber !== '0') {
    return { letter: 'A', docType: 'CUIT', docNumber: buyerDocNumber };
  }
  if (buyerDocType === 'DNI' && buyerDocNumber && buyerDocNumber !== '0') {
    return { letter: 'B', docType: 'DNI', docNumber: buyerDocNumber };
  }
  return { letter: 'B', docType: 'CONSUMIDOR_FINAL', docNumber: '0' };
}

export async function POST(req: NextRequest) {
  let body: { type?: string; action?: string; data?: { id?: string }; user_id?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  // MP envía type='payment' para notificaciones de pago
  if (body.type !== 'payment') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const paymentId = body.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  const mpSellerId = String(body.user_id ?? '');

  const supabase = await createClient();

  // Buscar integración por el MP user_id almacenado en config
  const { data: integrations } = await supabase
    .from('integrations')
    .select('accessToken, organizationId, config')
    .eq('platform', 'MERCADO_PAGO')
    .eq('status', 'CONNECTED');

  // Encontrar la integración cuyo config.userId coincide con el seller de la notificación
  const integration = integrations?.find(
    i => String(i.config?.userId ?? '') === mpSellerId
  ) ?? integrations?.[0]; // fallback: primera conectada (útil cuando solo hay un tenant)

  if (!integration?.accessToken) {
    console.error(`[MP webhook] Sin integración para MP user ${mpSellerId}`);
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
    // Obtener detalles del pago desde MP
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${integration.accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!paymentRes.ok) {
      console.error(`[MP webhook] Error obteniendo pago ${paymentId}: ${paymentRes.status}`);
      return NextResponse.json({ ok: true });
    }

    const payment = await paymentRes.json();

    // Solo pagos aprobados
    if (payment.status !== 'approved') {
      return NextResponse.json({ ok: true, skipped: `status: ${payment.status}` });
    }

    const totalAmount  = payment.transaction_amount ?? 0;
    const payer        = payment.payer ?? {};
    const identification = payer.identification ?? {};

    // "Venta Rápida" con link de pago: si este pago viene de una preferencia creada desde ahí,
    // external_reference apunta a la fila en pending_sales con los datos reales de la venta
    // (producto, cantidad, comprador, letra elegida) — más confiable que re-derivarlos del pago.
    let pendingSale: {
      id: string; productId: string | null; quantity: number | null;
      docType: string | null; docNumber: string | null; buyerName: string | null;
      description: string | null; amount: number; invoiceLetter: 'A' | 'B' | 'C'; ivaRate: number;
    } | null = null;
    if (payment.external_reference) {
      const { data } = await supabase.from('pending_sales')
        .select('id, productId, quantity, docType, docNumber, buyerName, description, amount, invoiceLetter, ivaRate, status')
        .eq('id', payment.external_reference)
        .eq('organizationId', integration.organizationId)
        .maybeSingle();
      if (data && data.status === 'PENDING') pendingSale = data;
    }

    let letter: 'A' | 'B' | 'C';
    let docType: string;
    let docNumber: string;
    let buyerName: string;

    if (pendingSale) {
      letter = pendingSale.invoiceLetter;
      docType = pendingSale.docType ?? 'CONSUMIDOR_FINAL';
      docNumber = pendingSale.docNumber ?? '0';
      buyerName = pendingSale.buyerName || [payer.first_name, payer.last_name].filter(Boolean).join(' ') || 'Consumidor Final';
    } else {
      const buyerDocType   = identification.type ?? null;
      const buyerDocNumber = String(identification.number ?? '').replace(/\D/g, '') || null;
      buyerName = [payer.first_name, payer.last_name].filter(Boolean).join(' ')
        || payer.email
        || 'Consumidor Final';
      ({ letter, docType, docNumber } = detectInvoiceType(sellerFiscalTreatment, buyerDocType, buyerDocNumber));
    }

    console.log(`[MP webhook] Pago ${paymentId} → Factura ${letter} | Comprador: ${buyerName} | Doc: ${docType} ${docNumber}${pendingSale ? ' | Venta Rápida' : ''}`);

    // Factura A: el monto de MP es bruto (IVA incluido), el Gateway espera neto
    const IVA_RATE = 0.21;
    const amountForGateway = letter === 'A'
      ? Math.round((totalAmount / (1 + IVA_RATE)) * 100) / 100
      : totalAmount;

    const usageCheck = await checkAndIncrementUsage(integration.organizationId);
    if (!usageCheck.allowed) {
      console.warn(`[MP webhook] Límite de plan alcanzado para org ${integration.organizationId}: ${usageCheck.reason}`);
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
        idempotency_key: `mercadopago:payment:${paymentId}`,
        invoice: {
          total_amount:   amountForGateway,
          invoice_letter: letter,
          iva_rate:       pendingSale?.ivaRate ?? undefined,
          concept:        1,
          description:    pendingSale?.description || `Pago MP #${paymentId}`,
        },
        buyer: {
          full_name:  buyerName,
          doc_type:   docType,
          doc_number: docNumber,
          email:      payer.email,
        },
        source_app:   'mercadopago',
        external_ref: String(paymentId),
        metadata: {
          mpPaymentId: paymentId,
          mpSellerId,
          invoice_letter: letter,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const invoiceData = await gatewayRes.json();

    if (gatewayRes.ok) {
      console.log(`[MP webhook] ✅ Factura ${letter} emitida — ${invoiceData.invoice_number} | CAE: ${invoiceData.cae}`);

      const admin = createAdminClient();

      // La factura se emite en el mismo instante en que se confirma el pago de MP,
      // así que ya nace conciliada — evita que aparezca como "Pendiente" en Facturación.
      if (invoiceData.invoice_id) {
        await admin.from('invoice_payments').upsert({
          organizationId: integration.organizationId,
          invoiceId:      invoiceData.invoice_id,
          invoiceNumber:  invoiceData.invoice_number ?? null,
          status:         'PAID',
          paidAt:         new Date().toISOString(),
          paidAmount:     totalAmount,
          source:         'mercadopago',
          mpPaymentId:    String(paymentId),
          updatedAt:      new Date().toISOString(),
        }, { onConflict: 'organizationId,invoiceId' }).then(({ error }) => {
          if (error) console.error(`[MP webhook] No se pudo marcar como cobrada la factura ${invoiceData.invoice_id}:`, error.message);
        });
      }

      // Venta Rápida: recién ahora (pago confirmado) se descuenta el stock real y se marca
      // la venta como pagada — evita el caso de "cargué la venta pero el cliente no pagó".
      if (pendingSale) {
        if (pendingSale.productId && pendingSale.quantity) {
          const { data: product } = await admin.from('products')
            .select('stock').eq('id', pendingSale.productId).eq('organizationId', integration.organizationId).maybeSingle();
          if (product && product.stock !== null) {
            await admin.from('products')
              .update({ stock: Math.max(0, product.stock - pendingSale.quantity), updatedAt: new Date().toISOString() })
              .eq('id', pendingSale.productId).eq('organizationId', integration.organizationId);
          }
          await registrarVentaItem({
            organizationId: integration.organizationId,
            productId: pendingSale.productId,
            origin: 'mercadopago',
            invoiceId: invoiceData.invoice_id ?? null,
            quantity: pendingSale.quantity,
            unitPrice: pendingSale.amount / pendingSale.quantity,
          });
        }
        await admin.from('pending_sales')
          .update({ status: 'PAID', paidAt: new Date().toISOString() })
          .eq('id', pendingSale.id);
      }
    } else {
      console.error(`[MP webhook] ❌ Error: ${invoiceData.error}`);
    }

  } catch (err) {
    console.error(`[MP webhook] Error procesando pago ${paymentId}:`, err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
