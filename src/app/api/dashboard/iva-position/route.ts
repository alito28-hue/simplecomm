import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

interface GatewayInvoice {
  status: string;
  iva_amount: number;
  net_amount: number;
  invoice_type: number | null;
  pto_vta: number | null;
  invoice_number_int: number | null;
}

function naturalKey(tipo: number | null | undefined, ptoVta: number | null | undefined, numero: number | null | undefined) {
  return `${tipo}-${ptoVta}-${numero}`;
}

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

  // --- Ventas: facturas emitidas por el Gateway este mes, en vivo ---
  let salesIva = 0;
  let salesNet = 0;
  let salesCount = 0;
  let lastGatewayInvoiceAt: string | null = null;
  const gatewayKeys = new Set<string>();
  try {
    const apiKey = await getGatewayKey(user.id);
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
      const invoices: (GatewayInvoice & { created_at?: string })[] = json.data ?? [];
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

  // --- Ventas importadas de ARCA ("Mis Comprobantes" emitidos) que no estén ---
  // --- ya en el Gateway (evita contar dos veces la misma factura). ---
  const { data: arcaSales } = await supabase
    .from('arca_sales_invoices')
    .select('tipoComprobante, puntoVenta, numeroComprobante, netAmount, ivaAmount')
    .eq('organizationId', user.id)
    .gte('issueDate', from)
    .lte('issueDate', to);

  for (const row of arcaSales ?? []) {
    const key = naturalKey(row.tipoComprobante, row.puntoVenta, row.numeroComprobante);
    if (gatewayKeys.has(key)) continue;
    salesIva += Number(row.ivaAmount ?? 0);
    salesNet += Number(row.netAmount ?? 0);
    salesCount += 1;
  }

  // --- Compras: sumar IVA de facturas de proveedores cargadas este mes ---
  // (manuales + extraídas por IA + importadas de ARCA "recibidos", ya conviven en la misma tabla)
  const { data: purchases } = await supabase
    .from('purchase_invoices')
    .select('netAmount, ivaAmount')
    .eq('organizationId', user.id)
    .gte('issueDate', from)
    .lte('issueDate', to);

  const purchasesIva = (purchases ?? []).reduce((sum, p) => sum + Number(p.ivaAmount ?? 0), 0);
  const purchasesNet = (purchases ?? []).reduce((sum, p) => sum + Number(p.netAmount ?? 0), 0);
  const purchasesCount = (purchases ?? []).length;

  // --- Última actualización de cada lado (import ARCA o registro propio, lo más reciente) ---
  const { data: imports } = await supabase
    .from('arca_import_log')
    .select('importType, importedAt')
    .eq('organizationId', user.id)
    .order('importedAt', { ascending: false });

  const lastSalesImportAt = imports?.find(i => i.importType === 'emitidos')?.importedAt ?? null;
  const lastPurchasesImportAt = imports?.find(i => i.importType === 'recibidos')?.importedAt ?? null;

  const salesUpdatedAt = [lastGatewayInvoiceAt, lastSalesImportAt].filter(Boolean).sort().pop() ?? null;

  return NextResponse.json({
    applicable: true,
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
  });
}
