import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).toISOString();
}

const CHANNELS = ['mercadolibre', 'tiendanube', 'shopify', 'mercadopago', 'simplecomm', 'arca_import'] as const;
type Channel = typeof CHANNELS[number];

// Mapea el origin de venta_items / source_app del Gateway a la plataforma de la tabla
// integrations — no hay integración para 'simplecomm' (ventas directas, siempre disponibles,
// no dependen de conectar nada) ni para 'arca_import' (facturas emitidas fuera de SimpleComm
// e importadas después — no sabemos por qué canal se vendieron).
const ORIGIN_TO_PLATFORM: Partial<Record<Channel, string>> = {
  mercadolibre: 'MERCADO_LIBRE',
  tiendanube: 'TIENDANUBE',
  shopify: 'SHOPIFY',
  mercadopago: 'MERCADO_PAGO',
};

// 'simplecomm-scheduled' (Facturas Programadas) y cualquier source_app no reconocido caen en
// "Directo" — no son de ningún canal externo real.
function channelFromSourceApp(sourceApp: string | null | undefined): Channel {
  if (sourceApp === 'mercadolibre' || sourceApp === 'tiendanube' || sourceApp === 'shopify' || sourceApp === 'mercadopago') {
    return sourceApp;
  }
  return 'simplecomm';
}

function naturalKey(tipo: number | null | undefined, ptoVta: number | null | undefined, numero: number | null | undefined) {
  return `${tipo}-${ptoVta}-${numero}`;
}

interface GatewayInvoice {
  status: string;
  total_amount: number;
  invoice_type: number | null;
  pto_vta: number | null;
  invoice_number_int: number | null;
  source_app: string | null;
  created_at?: string;
}

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

  // --- Totales y desglose por canal: se toman de las facturas reales (Gateway emitidas +
  // importadas de ARCA que no estén ya en el Gateway), igual que Posición de IVA/Ganancias —
  // cualquier factura emitida es una venta, tenga o no un producto de catálogo asociado. ---
  const porCanal = Object.fromEntries(CHANNELS.map(c => [c, { revenue: 0, count: 0 }])) as Record<Channel, { revenue: number; count: number }>;
  const gatewayKeys = new Set<string>();

  try {
    const apiKey = await getGatewayKey(user.id);
    let page = 1;
    let pages = 1;
    do {
      const params = new URLSearchParams({ page: String(page), limit: '100', status: 'issued', date_from: from, date_to: to });
      const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) break;
      const json = await res.json();
      const invoices: GatewayInvoice[] = json.data ?? [];
      for (const inv of invoices) {
        const channel = channelFromSourceApp(inv.source_app);
        porCanal[channel].revenue += Number(inv.total_amount ?? 0);
        porCanal[channel].count += 1;
        gatewayKeys.add(naturalKey(inv.invoice_type, inv.pto_vta, inv.invoice_number_int));
      }
      pages = json.meta?.pages ?? 1;
      page += 1;
    } while (page <= pages && page <= 20);
  } catch {
    // Si el Gateway no responde, seguimos con lo que haya de ARCA importado.
  }

  const { data: arcaSales } = await supabase
    .from('arca_sales_invoices')
    .select('tipoComprobante, puntoVenta, numeroComprobante, totalAmount')
    .eq('organizationId', user.id)
    .gte('issueDate', from.slice(0, 10))
    .lte('issueDate', to.slice(0, 10));

  for (const row of arcaSales ?? []) {
    const key = naturalKey(row.tipoComprobante, row.puntoVenta, row.numeroComprobante);
    if (gatewayKeys.has(key)) continue; // ya está contada como emitida por el Gateway
    porCanal.arca_import.revenue += Number(row.totalAmount ?? 0);
    porCanal.arca_import.count += 1;
  }

  const canales = CHANNELS
    .filter(c => connectedOrigins.has(c) || ((c === 'simplecomm' || c === 'arca_import') && porCanal[c].count > 0))
    .map(c => ({
      canal: c,
      revenue: Math.round(porCanal[c].revenue * 100) / 100,
      orders: porCanal[c].count,
    }));

  const totalRevenue = canales.reduce((s, c) => s + c.revenue, 0);
  const totalOrders = canales.reduce((s, c) => s + c.orders, 0);

  // --- Unidades / productos más vendidos / desglose de "Directo" por canal manual: esto sí
  // depende de venta_items (registro por producto), que no cubre el 100% de las facturas —
  // es un detalle complementario, no la fuente de los totales de arriba. ---
  const visibleOrigins = new Set<string>([...connectedOrigins, 'simplecomm']);
  const { data: items } = await supabase
    .from('venta_items')
    .select('id, productId, origin, quantity, unitPrice, manualChannel, products(description)')
    .eq('organizationId', user.id)
    .gte('createdAt', from)
    .lte('createdAt', to);

  const porProducto = new Map<string, { name: string; units: number; revenue: number }>();
  const porCanalManual = new Map<string, { revenue: number; units: number; count: number }>();
  let totalUnits = 0;

  for (const r of items ?? []) {
    if (!visibleOrigins.has(r.origin)) continue;
    const revenue = Number(r.unitPrice) * r.quantity;
    totalUnits += r.quantity;

    if (r.productId) {
      const product = r.products as unknown as { description: string } | null;
      const existing = porProducto.get(r.productId) ?? { name: product?.description ?? '(sin nombre)', units: 0, revenue: 0 };
      existing.units += r.quantity;
      existing.revenue += revenue;
      porProducto.set(r.productId, existing);
    }

    if (r.origin === 'simplecomm') {
      const label = r.manualChannel?.trim() || 'Sin especificar';
      const existing = porCanalManual.get(label) ?? { revenue: 0, units: 0, count: 0 };
      existing.revenue += revenue;
      existing.units += r.quantity;
      existing.count += 1;
      porCanalManual.set(label, existing);
    }
  }

  const directoPorCanal = Array.from(porCanalManual.entries())
    .map(([channel, v]) => ({ channel, revenue: Math.round(v.revenue * 100) / 100, units: v.units, orders: v.count }))
    .sort((a, b) => b.revenue - a.revenue);

  const topProductos = Array.from(porProducto.entries())
    .map(([productId, v]) => ({ productId, name: v.name, units: v.units, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return NextResponse.json({
    from,
    to,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    totalUnits,
    canales,
    directoPorCanal,
    topProductos,
    anyConnected: connectedOrigins.size > 0,
  });
}
