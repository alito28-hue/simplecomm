import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL    = process.env.GATEWAY_URL    ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';

/**
 * Webhook de Mercado Libre — recibe notificaciones de órdenes pagadas
 * y emite Factura B automáticamente via el Gateway.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // ML envía un POST con { resource, user_id, topic }
  const { resource, topic } = body as { resource: string; topic: string };

  if (topic !== 'orders_v2' && topic !== 'orders') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Obtener detalles de la orden desde ML API
  // El resource viene como "/orders/ORDER_ID"
  const orderId = resource?.split('/').pop();
  if (!orderId) return NextResponse.json({ ok: true, skipped: true });

  // Para obtener el token necesitamos buscar la integración del usuario
  // Por ahora procesamos con las credenciales del tenant por defecto
  // En producción esto se lookup por user_id del webhook

  try {
    await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        idempotency_key: `mercadolibre:order:${orderId}`,
        invoice: {
          total_amount: 0, // Se completará cuando obtengamos detalles de la orden
          concept: 1,
          description: `Venta Mercado Libre #${orderId}`,
        },
        buyer: { full_name: 'Consumidor Final', doc_type: 'CONSUMIDOR_FINAL', doc_number: '0' },
        source_app: 'mercadolibre',
        external_ref: orderId,
      }),
    });
  } catch (e) {
    console.error('Error procesando webhook ML:', e);
  }

  return NextResponse.json({ ok: true });
}

// ML requiere que el endpoint responda al GET de verificación
export async function GET() {
  return NextResponse.json({ ok: true });
}
