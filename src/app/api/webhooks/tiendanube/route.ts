import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { checkAndIncrementUsage } from '@/lib/usage';
import { processIncomingOrder, type OrderLineItem } from '@/lib/order-processing';

const USER_AGENT = 'SimpleComm (alito28@gmail.com)';
const TN_CLIENT_SECRET = process.env.TN_CLIENT_SECRET ?? '';

function verifyWebhook(body: string, signature: string): boolean {
  if (!TN_CLIENT_SECRET || !signature) return true; // skip en dev
  const hash = createHmac('sha256', TN_CLIENT_SECRET).update(body, 'utf8').digest('base64');
  return hash === signature;
}

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
  const rawBody = await req.text();
  const signature = req.headers.get('x-linkedstore-hmac-sha256') ?? '';

  if (!verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { store_id?: number; event?: string; id?: number };
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: true }); }

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
    const shipping    = order.shipping_address ?? {};

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

    // Contacto + productos (por SKU) + descuento de stock — no bloquea la emisión de factura
    // si algo falla acá (processIncomingOrder ya loguea sus propios errores internamente).
    const lineItems: OrderLineItem[] = (order.products ?? []).map((p: Record<string, unknown>) => ({
      sku: (p.sku as string) || null,
      name: String(p.name ?? ''),
      quantity: Number(p.quantity ?? 1),
      unitPrice: Number(p.price ?? 0),
    }));
    const orderResult = await processIncomingOrder(
      integration.organizationId,
      'tiendanube',
      String(orderId),
      {
        businessName: buyerName,
        docType: docType,
        docNumber: docNumber,
        email: consumer.email ?? null,
        phone: shipping.phone ?? null,
      },
      lineItems,
    );
    if (orderResult.alreadyProcessed) {
      console.log(`[TN webhook] Pedido ${orderId} ya se había procesado (contacto/stock) — se sigue igual con la factura (dedup por el Gateway).`);
    } else if (orderResult.productsCreated.length) {
      console.log(`[TN webhook] ${orderResult.productsCreated.length} producto(s) nuevo(s) creado(s) para revisión desde el pedido ${orderId}.`);
    }

    const IVA_RATE = 0.21;
    const amountForGateway = letter === 'A'
      ? Math.round((totalAmount / (1 + IVA_RATE)) * 100) / 100
      : totalAmount;

    const usageCheck = await checkAndIncrementUsage(integration.organizationId);
    if (!usageCheck.allowed) {
      console.warn(`[TN webhook] Límite de plan alcanzado para org ${integration.organizationId}: ${usageCheck.reason}`);
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
          clientId: orderResult.clientId,
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
