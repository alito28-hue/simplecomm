import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const GATEWAY_URL     = process.env.GATEWAY_URL     ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';

/**
 * Webhook de Mercado Libre
 *
 * ML notifica cuando se genera/paga una orden.
 * Nosotros obtenemos los detalles y emitimos la Factura B.
 *
 * Formato del body de ML:
 * { resource: "/orders/ORDER_ID", topic: "orders_v2", user_id: ML_USER_ID }
 */
export async function POST(req: NextRequest) {
  let body: { resource?: string; topic?: string; user_id?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  // Solo procesamos órdenes
  if (body.topic !== 'orders_v2' && body.topic !== 'orders') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const orderId = body.resource?.split('/').pop();
  if (!orderId) return NextResponse.json({ ok: true });

  const mlUserId = String(body.user_id ?? '');

  // Buscar la integración del usuario en Supabase para obtener su access_token
  const supabase = await createClient();
  const { data: integration } = await supabase
    .from('integrations')
    .select('accessToken, organizationId')
    .eq('platform', 'MERCADO_LIBRE')
    .eq('status', 'CONNECTED')
    .ilike('config->>"userId"', `%${mlUserId}%`)
    .maybeSingle();

  if (!integration?.accessToken) {
    console.error(`[ML webhook] No integration found for ML user ${mlUserId}`);
    return NextResponse.json({ ok: true });
  }

  try {
    // Obtener detalles de la orden desde la API de ML
    const orderRes = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${integration.accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!orderRes.ok) {
      console.error(`[ML webhook] Error obteniendo orden ${orderId}: ${orderRes.status}`);
      return NextResponse.json({ ok: true });
    }

    const order = await orderRes.json();

    // Solo procesar órdenes pagadas
    if (order.status !== 'paid') {
      return NextResponse.json({ ok: true, skipped: `order status: ${order.status}` });
    }

    // Extraer datos del comprador
    const buyer = order.buyer ?? {};
    const totalAmount = order.total_amount ?? 0;
    const buyerName = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || 'Consumidor Final';

    // Emitir Factura B via Gateway
    const gatewayRes = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        idempotency_key: `mercadolibre:order:${orderId}`,
        invoice: {
          total_amount: totalAmount,
          invoice_letter: 'B',
          concept: 1,
          description: `Venta ML #${orderId}`,
        },
        buyer: {
          full_name:  buyerName,
          doc_type:   'CONSUMIDOR_FINAL',
          doc_number: '0',
        },
        source_app:   'mercadolibre',
        external_ref: String(orderId),
        metadata: {
          mlOrderId:  orderId,
          mlUserId:   mlUserId,
          buyerNickname: buyer.nickname,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const invoiceData = await gatewayRes.json();

    if (gatewayRes.ok) {
      console.log(`[ML webhook] Factura emitida para orden ${orderId}: ${invoiceData.invoice_number}`);
    } else {
      console.error(`[ML webhook] Error emitiendo factura para orden ${orderId}: ${invoiceData.error}`);
    }

  } catch (err) {
    console.error(`[ML webhook] Error procesando orden ${orderId}:`, err);
  }

  // ML requiere siempre respuesta 200
  return NextResponse.json({ ok: true });
}

// ML verifica el endpoint con GET
export async function GET() {
  return NextResponse.json({ ok: true });
}
