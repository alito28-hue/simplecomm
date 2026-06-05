import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GATEWAY_URL     = process.env.GATEWAY_URL     ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';
const USER_AGENT      = 'SimpleComm (alito28@gmail.com)';

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
  let body: { store_id?: number; event?: string; id?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  if (body.event !== 'order/paid') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const orderId = body.id;
  const storeId = body.store_id;
  if (!orderId || !storeId) return NextResponse.json({ ok: true });

  const supabase = await createClient();

  // Buscar integración por storeId
  const { data: integrations } = await supabase
    .from('integrations')
    .select('accessToken, organizationId, config')
    .eq('platform', 'TIENDANUBE')
    .eq('status', 'CONNECTED');

  const integration = integrations?.find(
    i => String(i.config?.storeId ?? '') === String(storeId)
  ) ?? integrations?.[0];

  if (!integration?.accessToken) {
    console.error(`[TN webhook] Sin integración para store ${storeId}`);
    return NextResponse.json({ ok: true });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('fiscalTreatment')
    .eq('id', integration.organizationId)
    .maybeSingle();

  const sellerFiscalTreatment = org?.fiscalTreatment ?? 'RESPONSABLE_INSCRIPTO';

  try {
    // Obtener detalle del pedido desde TN API
    const orderRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${orderId}`, {
      headers: {
        'Authentication': `bearer ${integration.accessToken}`,
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!orderRes.ok) {
      console.error(`[TN webhook] Error obteniendo pedido ${orderId}: ${orderRes.status}`);
      return NextResponse.json({ ok: true });
    }

    const order = await orderRes.json();

    const totalAmount = parseFloat(order.total ?? '0');
    const consumer    = order.consumer ?? {};

    // TN guarda identificación en consumer.identification / consumer.identification_type
    // Puede ser 'DNI', 'CUIT', 'CUIL', etc.
    const rawDocType   = String(consumer.identification_type ?? '').toUpperCase() || null;
    const rawDocNumber = String(consumer.identification ?? '').replace(/\D/g, '') || null;

    // Normalizar: CUIL → CUIT para Factura A (misma validación fiscal)
    const buyerDocType   = rawDocType === 'CUIL' ? 'CUIT' : rawDocType;
    const buyerDocNumber = rawDocNumber;
    const buyerName      = consumer.name || consumer.email || 'Consumidor Final';

    const { letter, docType, docNumber } = detectInvoiceType(
      sellerFiscalTreatment,
      buyerDocType,
      buyerDocNumber
    );

    console.log(`[TN webhook] Pedido ${orderId} → Factura ${letter} | Comprador: ${buyerName} | Doc: ${docType} ${docNumber}`);

    const IVA_RATE = 0.21;
    const amountForGateway = letter === 'A'
      ? Math.round((totalAmount / (1 + IVA_RATE)) * 100) / 100
      : totalAmount;

    const gatewayRes = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        idempotency_key: `tiendanube:order:${storeId}:${orderId}`,
        invoice: {
          total_amount:   amountForGateway,
          invoice_letter: letter,
          concept:        1,
          description:    `Venta TN #${orderId}`,
        },
        buyer: {
          full_name:  buyerName,
          doc_type:   docType,
          doc_number: docNumber,
          email:      consumer.email,
        },
        source_app:   'tiendanube',
        external_ref: String(orderId),
        metadata: {
          tnOrderId: orderId,
          tnStoreId: storeId,
          invoice_letter: letter,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const invoiceData = await gatewayRes.json();

    if (gatewayRes.ok) {
      console.log(`[TN webhook] ✅ Factura ${letter} emitida — ${invoiceData.invoice_number} | CAE: ${invoiceData.cae}`);
    } else {
      console.error(`[TN webhook] ❌ Error: ${invoiceData.error}`);
    }

  } catch (err) {
    console.error(`[TN webhook] Error procesando pedido ${orderId}:`, err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
