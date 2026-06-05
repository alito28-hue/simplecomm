import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@/lib/supabase/server';

const GATEWAY_URL        = process.env.GATEWAY_URL        ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY    = process.env.GATEWAY_API_KEY    ?? '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';

function verifyWebhook(body: string, signature: string): boolean {
  if (!SHOPIFY_CLIENT_SECRET || !signature) return true; // skip en dev
  const hash = createHmac('sha256', SHOPIFY_CLIENT_SECRET).update(body, 'utf8').digest('base64');
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

/**
 * Shopify no tiene campos nativos de CUIT/DNI.
 * Buscamos en:
 *  1. note_attributes: { name: 'CUIT' | 'DNI' | 'NIF', value: '...' }
 *  2. billing_address.company: si tiene 11 dígitos continuos → CUIT
 */
function extractBuyerDoc(order: Record<string, unknown>): { docType: string | null; docNumber: string | null } {
  const noteAttrs = (order.note_attributes as Array<{ name: string; value: string }>) ?? [];

  for (const attr of noteAttrs) {
    const name = String(attr.name ?? '').toUpperCase();
    const value = String(attr.value ?? '').replace(/\D/g, '');
    if ((name === 'CUIT' || name === 'CUIL') && value.length === 11) {
      return { docType: 'CUIT', docNumber: value };
    }
    if (name === 'DNI' && value.length >= 7) {
      return { docType: 'DNI', docNumber: value };
    }
  }

  // Fallback: company field con 11 dígitos → asumimos CUIT
  const billing = (order.billing_address as Record<string, unknown>) ?? {};
  const company = String(billing.company ?? '').replace(/\D/g, '');
  if (company.length === 11) {
    return { docType: 'CUIT', docNumber: company };
  }

  return { docType: null, docNumber: null };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const shopDomain = req.headers.get('x-shopify-shop-domain') ?? '';
  const topic = req.headers.get('x-shopify-topic') ?? '';

  if (!verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (topic !== 'orders/paid') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let order: Record<string, unknown>;
  try { order = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: true }); }

  const orderId = order.id;
  if (!orderId) return NextResponse.json({ ok: true });

  const supabase = await createClient();

  // Encontrar integración por shop domain
  const { data: integrations } = await supabase
    .from('integrations')
    .select('accessToken, organizationId, config')
    .eq('platform', 'SHOPIFY')
    .eq('status', 'CONNECTED');

  const integration = integrations?.find(
    i => i.config?.shop === shopDomain
  ) ?? integrations?.[0];

  if (!integration?.accessToken) {
    console.error(`[Shopify webhook] Sin integración para shop ${shopDomain}`);
    return NextResponse.json({ ok: true });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('fiscalTreatment')
    .eq('id', integration.organizationId)
    .maybeSingle();

  const sellerFiscalTreatment = org?.fiscalTreatment ?? 'RESPONSABLE_INSCRIPTO';

  try {
    const totalAmount = parseFloat(String(order.total_price ?? '0'));
    const customer    = (order.customer as Record<string, unknown>) ?? {};
    const billing     = (order.billing_address as Record<string, unknown>) ?? {};

    const { docType, docNumber } = extractBuyerDoc(order);
    const buyerName = [billing.first_name, billing.last_name].filter(Boolean).join(' ')
      || [customer.first_name, customer.last_name].filter(Boolean).join(' ')
      || String(customer.email ?? '')
      || 'Consumidor Final';

    const { letter, docType: finalDocType, docNumber: finalDocNumber } = detectInvoiceType(
      sellerFiscalTreatment,
      docType,
      docNumber
    );

    console.log(`[Shopify webhook] Orden ${orderId} → Factura ${letter} | Comprador: ${buyerName}`);

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
        idempotency_key: `shopify:order:${shopDomain}:${orderId}`,
        invoice: {
          total_amount:   amountForGateway,
          invoice_letter: letter,
          concept:        1,
          description:    `Venta Shopify #${order.order_number ?? orderId}`,
        },
        buyer: {
          full_name:  buyerName,
          doc_type:   finalDocType,
          doc_number: finalDocNumber,
          email:      String(customer.email ?? billing.email ?? ''),
        },
        source_app:   'shopify',
        external_ref: String(orderId),
        metadata: {
          shopifyOrderId: orderId,
          shopDomain,
          invoice_letter: letter,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const invoiceData = await gatewayRes.json();

    if (gatewayRes.ok) {
      console.log(`[Shopify webhook] ✅ Factura ${letter} emitida — ${invoiceData.invoice_number} | CAE: ${invoiceData.cae}`);
    } else {
      console.error(`[Shopify webhook] ❌ Error: ${invoiceData.error}`);
    }

  } catch (err) {
    console.error(`[Shopify webhook] Error procesando orden ${orderId}:`, err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
