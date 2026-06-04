import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL    = process.env.GATEWAY_URL    ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';
const WEBHOOK_SECRET  = process.env.CLUBSORTEOS_WEBHOOK_SECRET ?? '';

/**
 * Webhook de ClubSorteos → SimpleComm → Gateway AFIP
 *
 * ClubSorteos llama a este endpoint cuando se paga un pedido.
 * SimpleComm lo convierte en una Factura B y la emite via el Gateway.
 *
 * Headers requeridos:
 *   x-webhook-secret: <CLUBSORTEOS_WEBHOOK_SECRET>
 *
 * Body esperado:
 * {
 *   order_id: string,
 *   amount: number,        // monto final con IVA incluido
 *   buyer_name: string,
 *   buyer_email?: string,
 *   buyer_doc_type?: "DNI" | "CUIT" | "CONSUMIDOR_FINAL",
 *   buyer_doc_number?: string,
 *   description?: string
 * }
 */
export async function POST(req: NextRequest) {
  // Validar webhook secret
  const secret = req.headers.get('x-webhook-secret');
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    order_id: string;
    amount: number;
    buyer_name?: string;
    buyer_email?: string;
    buyer_doc_type?: string;
    buyer_doc_number?: string;
    description?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.order_id || !body.amount) {
    return NextResponse.json({ error: 'order_id y amount son requeridos' }, { status: 400 });
  }

  const payload = {
    idempotency_key: `clubsorteos:order:${body.order_id}`,
    invoice: {
      total_amount: body.amount,
      concept: 1,
      description: body.description ?? `Orden ClubSorteos #${body.order_id}`,
    },
    buyer: {
      full_name:   body.buyer_name      ?? 'Consumidor Final',
      doc_type:    body.buyer_doc_type  ?? 'CONSUMIDOR_FINAL',
      doc_number:  body.buyer_doc_number ?? '0',
      email:       body.buyer_email,
    },
    source_app: 'clubsorteos',
    external_ref: body.order_id,
  };

  const res = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_API_KEY}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({
      ok: false,
      error: data.error ?? 'Error en Gateway',
      order_id: body.order_id,
    }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    order_id:       body.order_id,
    invoice_number: data.invoice_number,
    cae:            data.cae,
    cae_due_date:   data.cae_due_date,
    status:         data.status,
  });
}
