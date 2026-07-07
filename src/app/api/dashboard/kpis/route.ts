import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComprobantesUnificados } from '@/lib/facturas';

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  const fromCurrent = firstDayOfMonth(thisYear, thisMonth);
  const prevDate = new Date(thisYear, thisMonth - 1, 1);
  const fromPrev = firstDayOfMonth(prevDate.getFullYear(), prevDate.getMonth());
  const toPrev = lastDayOfMonth(prevDate.getFullYear(), prevDate.getMonth());

  const all = await getComprobantesUnificados(supabase, user.id);
  const issued = all.filter(c => c.status === 'issued');

  const currentInvoices = issued.filter(c => c.created_at.slice(0, 10) >= fromCurrent);
  const prevInvoices = issued.filter(c => c.created_at.slice(0, 10) >= fromPrev && c.created_at.slice(0, 10) <= toPrev);

  const monthAmount = currentInvoices.reduce((s, i) => s + i.total_amount, 0);
  const prevAmount = prevInvoices.reduce((s, i) => s + i.total_amount, 0);

  let monthVsLastAmount = 0;
  if (prevAmount > 0) {
    monthVsLastAmount = Math.round(((monthAmount - prevAmount) / prevAmount) * 100);
  }

  return NextResponse.json({
    monthInvoices: currentInvoices.length,
    monthAmount,
    monthVsLastAmount,
    pendingCount: issued.length,
    lastInvoices: all.slice(0, 5),
  });
}
