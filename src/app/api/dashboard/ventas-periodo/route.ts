import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComprobantesUnificados } from '@/lib/facturas';

// Serie diaria de facturado (comprobantes emitidos, status issued) para el gráfico "Ventas
// por período" del dashboard — mismos datos que ya alimentan el resto del panel de negocio
// (getComprobantesUnificados: Gateway + ARCA importado), solo agrupados por día.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(7, Number(searchParams.get('days') ?? '30')));

  const all = await getComprobantesUnificados(supabase, user.id);
  const issued = all.filter(c => c.status === 'issued');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }

  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  const fromStr = from.toISOString().slice(0, 10);

  for (const c of issued) {
    const day = c.created_at.slice(0, 10);
    if (day < fromStr) continue;
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + c.total_amount);
  }

  const series = Array.from(byDay.entries()).map(([date, amount]) => ({ date, amount }));
  const total = series.reduce((s, p) => s + p.amount, 0);

  return NextResponse.json({ days, series, total });
}
