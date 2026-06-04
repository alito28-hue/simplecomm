import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL     = process.env.GATEWAY_URL     ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';
const WEBHOOK_SECRET  = process.env.CLUBSORTEOS_WEBHOOK_SECRET ?? '';

/**
 * POST /api/batches/invoices
 *
 * Endpoint de facturación masiva — acepta un lote completo de facturas
 * y las emite a través del Gateway AFIP.
 *
 * Autenticación: Bearer token (igual que el endpoint individual de ClubSorteos).
 *
 * Contrato completo en: docs/api-contracts/batch-invoicing.md
 */
export async function POST(req: NextRequest) {
  // Autenticación Bearer
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Validaciones básicas
  const { batchId, items } = body as { batchId?: string; items?: unknown[] };
  if (!batchId) return NextResponse.json({ error: 'batchId requerido' }, { status: 400 });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items debe ser un array no vacío' }, { status: 400 });
  }
  if (items.length > 5000) {
    return NextResponse.json({ error: 'Máximo 5000 ítems por lote' }, { status: 400 });
  }

  // Reenviar al Gateway
  const res = await fetch(`${GATEWAY_URL}/v1/batches/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_API_KEY}`,
    },
    body: JSON.stringify(body),
    // Sin timeout — los lotes grandes pueden tardar varios minutos
    signal: AbortSignal.timeout(30 * 60 * 1000), // 30 min max
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Error en Gateway' }, { status: res.status });
  }

  return NextResponse.json(data);
}

/**
 * GET /api/batches/invoices?batchId=xxx
 * Consulta el estado de un lote ya procesado.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const batchId = new URL(req.url).searchParams.get('batchId');
  if (!batchId) return NextResponse.json({ error: 'batchId requerido' }, { status: 400 });

  const res = await fetch(`${GATEWAY_URL}/v1/batches/${batchId}`, {
    headers: { 'Authorization': `Bearer ${GATEWAY_API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });

  return NextResponse.json(await res.json(), { status: res.status });
}
