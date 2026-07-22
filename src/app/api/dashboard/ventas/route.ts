import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).toISOString();
}

const CHANNELS = ['mercadolibre', 'tiendanube', 'shopify', 'mercadopago', 'simplecomm'] as const;

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
    .select('id, productId, origin, externalOrderId, quantity, unitPrice, products(description)')
    .eq('organizationId', user.id)
    .gte('createdAt', from)
    .lte('createdAt', to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = items ?? [];

  const porCanal = Object.fromEntries(CHANNELS.map(c => [c, { revenue: 0, units: 0, orderKeys: new Set<string>() }]));
  const porProducto = new Map<string, { name: string; units: number; revenue: number }>();

  let totalRevenue = 0;
  let totalUnits = 0;

  for (const r of rows) {
    const canal = porCanal[r.origin as typeof CHANNELS[number]];
    const revenue = Number(r.unitPrice) * r.quantity;
    if (canal) {
      canal.revenue += revenue;
      canal.units += r.quantity;
      canal.orderKeys.add(r.externalOrderId ?? r.id);
    }
    totalRevenue += revenue;
    totalUnits += r.quantity;

    if (r.productId) {
      const product = r.products as unknown as { description: string } | null;
      const key = r.productId;
      const existing = porProducto.get(key) ?? { name: product?.description ?? '(sin nombre)', units: 0, revenue: 0 };
      existing.units += r.quantity;
      existing.revenue += revenue;
      porProducto.set(key, existing);
    }
  }

  const canales = CHANNELS.map(c => ({
    canal: c,
    revenue: Math.round(porCanal[c].revenue * 100) / 100,
    units: porCanal[c].units,
    orders: porCanal[c].orderKeys.size,
  })).filter(c => c.units > 0);

  const topProductos = Array.from(porProducto.entries())
    .map(([productId, v]) => ({ productId, name: v.name, units: v.units, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return NextResponse.json({
    from,
    to,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalUnits,
    canales,
    topProductos,
  });
}
