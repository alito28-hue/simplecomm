import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).toISOString();
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const from = searchParams.get('from') ?? firstDayOfMonth(now.getFullYear(), now.getMonth());
  const to = searchParams.get('to') ?? now.toISOString();

  const { data: items, error } = await supabase
    .from('venta_items')
    .select('id, productId, origin, invoiceId, externalOrderId, quantity, unitPrice, unitCost, shippingCost, shippingCostSource, createdAt, products(description, code)')
    .eq('organizationId', user.id)
    .gte('createdAt', from)
    .lte('createdAt', to)
    .order('createdAt', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = items ?? [];

  let unidades = 0;
  let vendido = 0;
  let costoProductos = 0;
  let costoLogistica = 0;
  let itemsSinCosto = 0;
  let itemsSinLogistica = 0;

  for (const r of rows) {
    unidades += r.quantity;
    vendido += Number(r.unitPrice) * r.quantity;
    if (r.unitCost !== null) costoProductos += Number(r.unitCost) * r.quantity;
    else itemsSinCosto += 1;
    if (r.shippingCost !== null) costoLogistica += Number(r.shippingCost);
    else itemsSinLogistica += 1;
  }

  const margen = vendido - costoProductos - costoLogistica;
  const porcentajeMargen = vendido > 0 ? Math.round((margen / vendido) * 1000) / 10 : 0;

  const { data: org } = await supabase.from('organizations')
    .select('costoLogisticaDefault').eq('id', user.id).maybeSingle();

  return NextResponse.json({
    items: rows,
    resumen: {
      unidades,
      vendido,
      costoProductos,
      costoLogistica,
      margen,
      porcentajeMargen,
      itemsSinCosto,
      itemsSinLogistica,
      totalItems: rows.length,
    },
    costoLogisticaDefault: org?.costoLogisticaDefault ?? null,
  });
}
