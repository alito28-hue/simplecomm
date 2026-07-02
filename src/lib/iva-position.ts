import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

interface GatewayInvoice {
  status: string;
  iva_amount: number;
  net_amount: number;
  invoice_type: number | null;
  pto_vta: number | null;
  invoice_number_int: number | null;
  created_at?: string;
}

function naturalKey(tipo: number | null | undefined, ptoVta: number | null | undefined, numero: number | null | undefined) {
  return `${tipo}-${ptoVta}-${numero}`;
}

export interface IvaPositionResult {
  from: string;
  to: string;
  salesIva: number;
  salesNet: number;
  salesCount: number;
  salesUpdatedAt: string | null;
  purchasesIva: number;
  purchasesNet: number;
  purchasesCount: number;
  lastPurchasesImportAt: string | null;
  position: number;
}

/**
 * Posición de IVA (ventas - compras) para un rango de fechas [from, to] (YYYY-MM-DD).
 * Ventas: facturas emitidas por el Gateway en vivo + lo importado de ARCA "emitidos" que
 * no esté ya en el Gateway (evita contar dos veces la misma factura, ver clave natural).
 * Compras: purchase_invoices del rango (manual + IA + ARCA "recibidos", ya conviven en la misma tabla).
 */
export async function computeIvaPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  from: string,
  to: string,
): Promise<IvaPositionResult> {
  let salesIva = 0;
  let salesNet = 0;
  let salesCount = 0;
  let lastGatewayInvoiceAt: string | null = null;
  const gatewayKeys = new Set<string>();
  try {
    const apiKey = await getGatewayKey(userId);
    let page = 1;
    let pages = 1;
    do {
      const params = new URLSearchParams({
        page: String(page), limit: '100', status: 'issued', date_from: from, date_to: `${to}T23:59:59.999Z`,
      });
      const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) break;
      const json = await res.json();
      const invoices: GatewayInvoice[] = json.data ?? [];
      for (const inv of invoices) {
        salesIva += Number(inv.iva_amount ?? 0);
        salesNet += Number(inv.net_amount ?? 0);
        gatewayKeys.add(naturalKey(inv.invoice_type, inv.pto_vta, inv.invoice_number_int));
        if (inv.created_at && (!lastGatewayInvoiceAt || inv.created_at > lastGatewayInvoiceAt)) {
          lastGatewayInvoiceAt = inv.created_at;
        }
      }
      salesCount += invoices.length;
      pages = json.meta?.pages ?? 1;
      page += 1;
    } while (page <= pages && page <= 20);
  } catch {
    // Si el Gateway no responde, devolvemos lo que tengamos (compras) y avisamos.
  }

  const { data: arcaSales } = await supabase
    .from('arca_sales_invoices')
    .select('tipoComprobante, puntoVenta, numeroComprobante, netAmount, ivaAmount')
    .eq('organizationId', userId)
    .gte('issueDate', from)
    .lte('issueDate', to);

  for (const row of arcaSales ?? []) {
    const key = naturalKey(row.tipoComprobante, row.puntoVenta, row.numeroComprobante);
    if (gatewayKeys.has(key)) continue;
    salesIva += Number(row.ivaAmount ?? 0);
    salesNet += Number(row.netAmount ?? 0);
    salesCount += 1;
  }

  const { data: purchases } = await supabase
    .from('purchase_invoices')
    .select('netAmount, ivaAmount')
    .eq('organizationId', userId)
    .gte('issueDate', from)
    .lte('issueDate', to);

  const purchasesIva = (purchases ?? []).reduce((sum, p) => sum + Number(p.ivaAmount ?? 0), 0);
  const purchasesNet = (purchases ?? []).reduce((sum, p) => sum + Number(p.netAmount ?? 0), 0);
  const purchasesCount = (purchases ?? []).length;

  // Nota: se toma la importación más reciente en general (no acotada a [from, to]),
  // porque una importación siempre se registra con la fecha en que se hizo (hoy),
  // sin importar el período de los comprobantes que trae — es un indicador de
  // "última sincronización", no un dato del mes consultado.
  const { data: imports } = await supabase
    .from('arca_import_log')
    .select('importType, importedAt')
    .eq('organizationId', userId)
    .order('importedAt', { ascending: false });

  const lastSalesImportAt = imports?.find(i => i.importType === 'emitidos')?.importedAt ?? null;
  const lastPurchasesImportAt = imports?.find(i => i.importType === 'recibidos')?.importedAt ?? null;

  const salesUpdatedAt = [lastGatewayInvoiceAt, lastSalesImportAt].filter(Boolean).sort().pop() ?? null;

  return {
    from,
    to,
    salesIva: Math.round(salesIva * 100) / 100,
    salesNet: Math.round(salesNet * 100) / 100,
    salesCount,
    salesUpdatedAt,
    purchasesIva: Math.round(purchasesIva * 100) / 100,
    purchasesNet: Math.round(purchasesNet * 100) / 100,
    purchasesCount,
    lastPurchasesImportAt,
    position: Math.round((salesIva - purchasesIva) * 100) / 100,
  };
}
