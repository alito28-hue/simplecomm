import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeIvaPosition } from '@/lib/iva-position';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase.from('organizations').select('fiscalTreatment').eq('id', user.id).maybeSingle();
  if (org?.fiscalTreatment !== 'RESPONSABLE_INSCRIPTO') {
    return NextResponse.json({ applicable: false });
  }

  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = now.toISOString().slice(0, 10);

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();
  const prevFrom = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
  const prevLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
  const prevTo = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

  const [result, previous] = await Promise.all([
    computeIvaPosition(supabase, user.id, from, to),
    computeIvaPosition(supabase, user.id, prevFrom, prevTo),
  ]);

  function pctDelta(current: number, prev: number) {
    return prev !== 0 ? Math.round(((current - prev) / Math.abs(prev)) * 1000) / 10 : null;
  }

  const deltaPercent = pctDelta(result.position, previous.position);
  const salesIvaDeltaPercent = pctDelta(result.salesIva, previous.salesIva);
  const purchasesIvaDeltaPercent = pctDelta(result.purchasesIva, previous.purchasesIva);

  return NextResponse.json({
    applicable: true,
    ...result,
    previousPosition: previous.position,
    deltaPercent,
    salesIvaDeltaPercent,
    purchasesIvaDeltaPercent,
  });
}
