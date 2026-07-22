import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).toISOString();
}

const CHANNELS = ['mercadolibre', 'tiendanube', 'shopify', 'mercadopago', 'simplecomm'] as const;

// Mapea el origin de venta_items a la plataforma de la tabla integrations — no hay
// integración para 'simplecomm' (ventas directas, siempre disponibles, no dependen de
// conectar nada), así que ese canal se muestra si tiene ventas, no si está "conectado".
const ORIGIN_TO_PLATFORM: Partial<Record<typeof CHANNELS[number], string>> = {
  mercadolibre: 'MERCADO_LIBRE',
  tiendanube: 'TIENDANUBE',
  shopify: 'SHOPIFY',
  mercadopago: 'MERCADO_PAGO',
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const from = searchParams.get('from') ?? firstDayOfMonth(now.getFullYear(), now.getMonth());
  const to = searchParams.get('to') ?? now.toISOString();

  const { data: integrations } = await supabase
    .from('integrations')
    .select('platform, status')
    .eq('organizationId', user.id)
    .eq('status', 'CONNECTED');
  const connectedPlatforms = new Set((integrations ?? []).map(i => i.platform));
  const connectedOrigins = new Set(
    CHANNELS.filter(c => ORIGIN_TO_PLATFORM[c] && connectedPlatforms.has(ORIGIN_TO_PLATFORM[c]!))
  );

  const { data: items, error } = await supabase
    .from('venta_items')
    .select('id, productId, origin, externalOrderId, quantity, unitPrice, manualChannel, products(description)')
    .eq('organizationId', user.id)
    .gte('createdAt', from)
    .lte('createdAt', to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = items ?? [];

  const porCanal = Object.fromEntries(CHANNELS.map(c => [c, { revenue: 0, units: 0, orderKeys: new Set<string>() }]));
  const porProducto = new Map<string, { name: string; units: number; revenue: number }>();
  const porCanalManual = new Map<string, { revenue: number; units: number; orderKeys: Set<string> }>();

  // Solo cuentan para los totales, la tabla por canal y los productos más vendidos las
  // ventas de canales realmente conectados (integrations.status = 'CONNECTED') — evita
  // ruido de ventas históricas/de prueba en integraciones que ya no están activas.
  // 'simplecomm' (ventas directas) no tiene concepto de "conectado": siempre cuenta.
  const visibleOrigins = new Set<string>([...connectedOrigins, 'simplecomm']);

  let totalRevenue = 0;
  let totalUnits = 0;

  for (const r of rows) {
    if (!visibleOrigins.has(r.origin)) continue;
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

    // Desglose de "Directo" por la etiqueta manual cargada al facturar (Instagram, WhatsApp,
    // etc.) — sin etiqueta va a "Sin especificar", así ayuda a ver qué canal manual funciona
    // mejor sin perder de vista lo que nadie tagueó todavía.
    if (r.origin === 'simplecomm') {
      const label = r.manualChannel?.trim() || 'Sin especificar';
      const existing = porCanalManual.get(label) ?? { revenue: 0, units: 0, orderKeys: new Set<string>() };
      existing.revenue += revenue;
      existing.units += r.quantity;
      existing.orderKeys.add(r.id);
      porCanalManual.set(label, existing);
    }
  }

  const canales = CHANNELS
    .filter(c => connectedOrigins.has(c) || (c === 'simplecomm' && porCanal[c].units > 0))
    .map(c => ({
      canal: c,
      revenue: Math.round(porCanal[c].revenue * 100) / 100,
      units: porCanal[c].units,
      orders: porCanal[c].orderKeys.size,
    }));

  const directoPorCanal = Array.from(porCanalManual.entries())
    .map(([channel, v]) => ({ channel, revenue: Math.round(v.revenue * 100) / 100, units: v.units, orders: v.orderKeys.size }))
    .sort((a, b) => b.revenue - a.revenue);

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
    directoPorCanal,
    topProductos,
    anyConnected: connectedOrigins.size > 0,
  });
}
