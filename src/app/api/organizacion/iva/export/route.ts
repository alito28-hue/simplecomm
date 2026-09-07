import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

interface GatewayInvoiceRow {
  status: string;
  buyer_name: string;
  buyer_doc: string | null;
  total_amount: number;
  net_amount: number;
  iva_amount: number;
  invoice_type: number | null;
  pto_vta: number | null;
  invoice_number_int: number | null;
  invoice_number: string | null;
  cae: string | null;
  created_at?: string;
}

interface ExportRow {
  tipo: 'Venta' | 'Compra';
  fecha: string;
  origen: string;
  comprobante: string;
  contraparte: string;
  contraparteDoc: string;
  neto: number;
  iva: number;
  total: number;
  cae: string;
}

// Códigos de comprobante AFIP → letra, para mostrar algo legible en el CSV.
const TIPO_LETRA: Record<number, string> = {
  1: 'A', 2: 'ND-A', 3: 'NC-A',
  6: 'B', 7: 'ND-B', 8: 'NC-B',
  11: 'C', 12: 'ND-C', 13: 'NC-C',
};

const ORIGEN_COMPRA: Record<string, string> = {
  manual: 'Manual',
  extracted: 'Foto/PDF (IA)',
  arca_import: 'ARCA (importado)',
};

function naturalKey(tipo: number | null | undefined, ptoVta: number | null | undefined, numero: number | null | undefined) {
  return `${tipo}-${ptoVta}-${numero}`;
}

function escapeCsv(v: string | number | null | undefined) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // 'YYYY-MM'
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Parámetro "month" inválido (formato YYYY-MM)' }, { status: 400 });
  }
  const [year, monthNum] = month.split('-').map(Number);
  const from = `${month}-01`;
  const to = `${month}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, '0')}`;

  const rows: ExportRow[] = [];
  const gatewayKeys = new Set<string>();

  // ── Ventas: facturas emitidas por el Gateway ────────────────────────────
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
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) break;
      const json = await res.json();
      const invoices: GatewayInvoiceRow[] = json.data ?? [];
      for (const inv of invoices) {
        gatewayKeys.add(naturalKey(inv.invoice_type, inv.pto_vta, inv.invoice_number_int));
        rows.push({
          tipo: 'Venta',
          fecha: (inv.created_at ?? '').slice(0, 10),
          origen: 'SimpleComm',
          comprobante: `${inv.invoice_type != null ? (TIPO_LETRA[inv.invoice_type] ?? inv.invoice_type) : '—'} ${inv.invoice_number ?? ''}`.trim(),
          contraparte: inv.buyer_name ?? '',
          contraparteDoc: inv.buyer_doc ?? '',
          neto: Number(inv.net_amount ?? 0),
          iva: Number(inv.iva_amount ?? 0),
          total: Number(inv.total_amount ?? 0),
          cae: inv.cae ?? '',
        });
      }
      pages = json.meta?.pages ?? 1;
      page += 1;
    } while (page <= pages && page <= 20);
  } catch {
    // Si el Gateway no responde, seguimos con lo importado de ARCA igual.
  }

  // ── Ventas: importadas de ARCA que no estén ya en el Gateway ────────────
  const { data: arcaSales } = await supabase
    .from('arca_sales_invoices')
    .select('tipoComprobante, puntoVenta, numeroComprobante, issueDate, receptorNombre, receptorCuit, netAmount, ivaAmount, totalAmount, cae')
    .eq('organizationId', user.id)
    .gte('issueDate', from)
    .lte('issueDate', to);

  for (const r of arcaSales ?? []) {
    if (gatewayKeys.has(naturalKey(r.tipoComprobante, r.puntoVenta, r.numeroComprobante))) continue;
    rows.push({
      tipo: 'Venta',
      fecha: r.issueDate ?? '',
      origen: 'ARCA (importado)',
      comprobante: `${TIPO_LETRA[r.tipoComprobante] ?? r.tipoComprobante} ${String(r.puntoVenta).padStart(4, '0')}-${String(r.numeroComprobante).padStart(8, '0')}`,
      contraparte: r.receptorNombre ?? 'Consumidor Final',
      contraparteDoc: r.receptorCuit ?? '',
      neto: Number(r.netAmount ?? 0),
      iva: Number(r.ivaAmount ?? 0),
      total: Number(r.totalAmount ?? 0),
      cae: r.cae ?? '',
    });
  }

  // ── Compras: manual + foto/IA + ARCA importado, ya conviven en una tabla ─
  const { data: purchases } = await supabase
    .from('purchase_invoices')
    .select('issueDate, issuerName, issuerCuit, invoiceLetter, invoiceNumber, netAmount, ivaAmount, totalAmount, source')
    .eq('organizationId', user.id)
    .gte('issueDate', from)
    .lte('issueDate', to);

  for (const p of purchases ?? []) {
    rows.push({
      tipo: 'Compra',
      fecha: p.issueDate ?? '',
      origen: ORIGEN_COMPRA[p.source] ?? p.source ?? '',
      comprobante: `${p.invoiceLetter ?? ''} ${p.invoiceNumber ?? ''}`.trim(),
      contraparte: p.issuerName ?? '',
      contraparteDoc: p.issuerCuit ?? '',
      neto: Number(p.netAmount ?? 0),
      iva: Number(p.ivaAmount ?? 0),
      total: Number(p.totalAmount ?? 0),
      cae: '',
    });
  }

  rows.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.tipo.localeCompare(b.tipo));

  const header = 'Fecha,Tipo,Origen,Comprobante,Contraparte,CUIT/Doc,Neto,IVA,Total,CAE';
  const csvRows = rows.map(r => [
    escapeCsv(r.fecha),
    escapeCsv(r.tipo),
    escapeCsv(r.origen),
    escapeCsv(r.comprobante),
    escapeCsv(r.contraparte),
    escapeCsv(r.contraparteDoc),
    escapeCsv(r.neto.toFixed(2)),
    escapeCsv(r.iva.toFixed(2)),
    escapeCsv(r.total.toFixed(2)),
    escapeCsv(r.cae),
  ].join(','));

  const csv = [header, ...csvRows].join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="posicion-iva_${month}.csv"`,
    },
  });
}
