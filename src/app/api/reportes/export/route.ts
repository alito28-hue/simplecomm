import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

function escapeCsv(v: string | number | null | undefined) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? '';
  const to   = searchParams.get('to')   ?? '';

  const apiKey = await getGatewayKey(user.id);

  const params = new URLSearchParams({ limit: '1000' });
  if (from) params.set('from', from);
  if (to)   params.set('to', to);

  const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return NextResponse.json({ error: 'Gateway error' }, { status: 502 });

  const gatewayData = await res.json();
  const invoices: Array<{
    invoice_number?: string | null;
    invoice_type?: string | null;
    buyer_name?: string | null;
    buyer_doc_number?: string | null;
    total_amount?: number;
    iva_amount?: number | null;
    status?: string | null;
    cae?: string | null;
    created_at?: string;
  }> = gatewayData.data ?? [];

  let filtered = invoices;
  if (from) filtered = filtered.filter(i => i.created_at && i.created_at >= from);
  if (to)   filtered = filtered.filter(i => i.created_at && i.created_at <= to + 'T23:59:59');

  const header = 'Fecha,N° Factura,Tipo,Receptor,CUIT,Monto,IVA,Estado,CAE';
  const rows = filtered.map(inv => [
    escapeCsv(inv.created_at ? inv.created_at.slice(0, 10) : ''),
    escapeCsv(inv.invoice_number),
    escapeCsv(inv.invoice_type),
    escapeCsv(inv.buyer_name),
    escapeCsv(inv.buyer_doc_number),
    escapeCsv(inv.total_amount),
    escapeCsv(inv.iva_amount),
    escapeCsv(inv.status),
    escapeCsv(inv.cae),
  ].join(','));

  const csv = [header, ...rows].join('\r\n');
  const period = from && to ? `${from}_${to}` : from || to || 'completo';

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="facturas_${period}.csv"`,
    },
  });
}
