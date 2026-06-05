import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

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

    // MP usa 'DNI' o 'CUIT' en identification.type
    const buyerDocType   = identification.type ?? null;
    const buyerDocNumber = String(identification.number ?? '').replace(/\D/g, '') || null;
    const buyerName = [payer.first_name, payer.last_name].filter(Boolean).join(' ')
      || payer.email
      || 'Consumidor Final';

    const { letter, docType, docNumber } = detectInvoiceType(
      sellerFiscalTreatment,
      buyerDocType,
      buyerDocNumber
    );

    console.log(`[MP webhook] Pago ${paymentId} → Factura ${letter} | Comprador: ${buyerName} | Doc: ${docType} ${docNumber}`);

    // Factura A: el monto de MP es bruto (IVA incluido), el Gateway espera neto
    const IVA_RATE = 0.21;
    const amountForGateway = letter === 'A'
      ? Math.round((totalAmount / (1 + IVA_RATE)) * 100) / 100
      : totalAmount;

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
          concept:        1,
          description:    `Pago MP #${paymentId}`,
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
