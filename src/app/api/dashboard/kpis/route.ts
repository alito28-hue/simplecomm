import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = await getGatewayKey(user.id);

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  const fromCurrent = firstDayOfMonth(thisYear, thisMonth);
  const toCurrent = now.toISOString().slice(0, 10);

  const prevDate = new Date(thisYear, thisMonth - 1, 1);
  const fromPrev = firstDayOfMonth(prevDate.getFullYear(), prevDate.getMonth());
  const toPrev = firstDayOfMonth(thisYear, thisMonth);

  async function fetchInvoices(params: URLSearchParams) {
    const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { data: [], meta: { total: 0 } };
    return res.json();
  }

  const [currentData, prevData, allData, lastData] = await Promise.all([
    fetchInvoices(new URLSearchParams({ from: fromCurrent, to: toCurrent, status: 'issued', limit: '1000' })),
    fetchInvoices(new URLSearchParams({ from: fromPrev, to: toPrev, status: 'issued', limit: '1000' })),
    fetchInvoices(new URLSearchParams({ status: 'issued', limit: '1', page: '1' })),
    fetchInvoices(new URLSearchParams({ limit: '5', page: '1' })),
  ]);

  const currentInvoices: Array<{ total_amount: number }> = currentData.data ?? [];
  const prevInvoices: Array<{ total_amount: number }> = prevData.data ?? [];

  const monthAmount = currentInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const prevAmount = prevInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);

  let monthVsLastAmount = 0;
  if (prevAmount > 0) {
    monthVsLastAmount = Math.round(((monthAmount - prevAmount) / prevAmount) * 100);
  }

  return NextResponse.json({
    monthInvoices: currentInvoices.length,
    monthAmount,
    monthVsLastAmount,
    pendingCount: allData.meta?.total ?? 0,
    lastInvoices: lastData.data ?? [],
  });
}
