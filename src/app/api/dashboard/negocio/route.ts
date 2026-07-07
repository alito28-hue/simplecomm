import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComprobantesUnificados } from '@/lib/facturas';

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const fromMonth = firstDayOfMonth(now.getFullYear(), now.getMonth());

  const all = await getComprobantesUnificados(supabase, user.id);
  const issuedThisMonth = all.filter(c => c.status === 'issued' && c.created_at.slice(0, 10) >= fromMonth);

  const ids = issuedThisMonth.map(c => c.invoice_id);
  const { data: payments } = ids.length
    ? await supabase.from('invoice_payments').select('invoiceId, status, paidAmount')
        .eq('organizationId', user.id).in('invoiceId', ids)
    : { data: [] };

  const paidMap = new Map((payments ?? []).map(p => [p.invoiceId, p]));

  let cobradoMes = 0;
  let cantidadCobradas = 0;
  const facturadoMes = issuedThisMonth.reduce((s, c) => s + c.total_amount, 0);
  for (const c of issuedThisMonth) {
    const p = paidMap.get(c.invoice_id);
    if (p?.status === 'PAID') {
      cobradoMes += Number(p.paidAmount ?? c.total_amount);
      cantidadCobradas += 1;
    }
  }
  const pendienteMes = Math.max(0, facturadoMes - cobradoMes);
  const porcentajeCobrado = facturadoMes > 0 ? Math.round((cobradoMes / facturadoMes) * 1000) / 10 : 0;

  return NextResponse.json({
    facturadoMes,
    cobradoMes,
    pendienteMes,
    porcentajeCobrado,
    cantidadFacturas: issuedThisMonth.length,
    cantidadCobradas,
  });
}
