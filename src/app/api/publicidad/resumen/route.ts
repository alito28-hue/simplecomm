import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const defaults = currentMonthRange();
  const from = searchParams.get('from') || defaults.from;
  const to = searchParams.get('to') || defaults.to;

  // 1. Inversión publicitaria: campañas que arrancan dentro del período
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select('spend')
    .eq('organizationId', user.id)
    .gte('startDate', from)
    .lte('startDate', to);

  const totalInvertido = (campaigns ?? []).reduce((s, c: { spend: number | null }) => s + (c.spend ?? 0), 0);

  // 2. Ingresos de otras fuentes/razones sociales (carga manual), períodos que se solapan con el filtro
  const { data: externos } = await supabase
    .from('external_revenues')
    .select('amount')
    .eq('organizationId', user.id)
    .lte('periodStart', to)
    .gte('periodEnd', from);

  const ingresosOtrasFuentes = (externos ?? []).reduce((s, r: { amount: number | null }) => s + (r.amount ?? 0), 0);

  // 3. Ingresos facturados en SimpleComm (lo que sí podemos ver con certeza)
  let ingresosFacturados = 0;
  try {
    const apiKey = await getGatewayKey(user.id);
    const params = new URLSearchParams({ from, to, status: 'issued', limit: '1000' });
    const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const data = await res.json();
      const invoices: Array<{ total_amount?: number; created_at?: string }> = data.data ?? [];
      ingresosFacturados = invoices
        .filter(i => i.created_at && i.created_at >= from && i.created_at <= to + 'T23:59:59')
        .reduce((s, i) => s + (i.total_amount ?? 0), 0);
    }
  } catch {
    // gateway no disponible — seguimos con 0, no bloqueamos el resumen
  }

  const ingresoTotal = ingresosFacturados + ingresosOtrasFuentes;
  const roas = totalInvertido > 0 ? ingresoTotal / totalInvertido : null;

  return NextResponse.json({
    from, to,
    totalInvertido,
    ingresosFacturados,
    ingresosOtrasFuentes,
    ingresoTotal,
    roas,
  });
}
