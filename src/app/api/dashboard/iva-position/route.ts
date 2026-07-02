import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

interface GatewayInvoice {
  status: string;
  iva_amount: number;
  net_amount: number;
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

  // --- Ventas: sumar IVA de facturas emitidas este mes (Gateway) ---
  let salesIva = 0;
  let salesNet = 0;
  let salesCount = 0;
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
      const invoices: GatewayInvoice[] = json.data ?? [];
      for (const inv of invoices) {
        salesIva += Number(inv.iva_amount ?? 0);
        salesNet += Number(inv.net_amount ?? 0);
      }
      salesCount += invoices.length;
      pages = json.meta?.pages ?? 1;
      page += 1;
    } while (page <= pages && page <= 20);
  } catch {
    // Si el Gateway no responde, devolvemos lo que tengamos (compras) y avisamos.
  }

  // --- Compras: sumar IVA de facturas de proveedores cargadas este mes ---
  const { data: purchases } = await supabase
    .from('purchase_invoices')
    .select('netAmount, ivaAmount')
    .eq('organizationId', user.id)
    .gte('issueDate', from)
    .lte('issueDate', to);

  const purchasesIva = (purchases ?? []).reduce((sum, p) => sum + Number(p.ivaAmount ?? 0), 0);
  const purchasesNet = (purchases ?? []).reduce((sum, p) => sum + Number(p.netAmount ?? 0), 0);
  const purchasesCount = (purchases ?? []).length;

  return NextResponse.json({
    applicable: true,
    from,
    to,
    salesIva: Math.round(salesIva * 100) / 100,
    salesNet: Math.round(salesNet * 100) / 100,
    salesCount,
    purchasesIva: Math.round(purchasesIva * 100) / 100,
    purchasesNet: Math.round(purchasesNet * 100) / 100,
    purchasesCount,
    position: Math.round((salesIva - purchasesIva) * 100) / 100,
  });
}
