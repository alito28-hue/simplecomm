import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

interface GatewayInvoiceRow {
  invoice_id: string;
  invoice_number: string | null;
  pto_vta: number | null;
  invoice_number_int: number | null;
  status: string;
  buyer_name: string;
  buyer_doc: string | null;
  total_amount: number;
  invoice_type: number | null;
  cae: string | null;
  cae_due_date: string | null;
  description: string | null;
  source_app: string | null;
  created_at: string;
  error: string | null;
}

export interface ComprobanteUnificado {
  invoice_id: string;
  invoice_number: string | null;
  status: 'issued' | 'pending' | 'error';
  buyer_name: string;
  /** CUIT/CUIL/DNI del receptor, sin separadores — null si no se pudo determinar. */
  buyer_doc: string | null;
  total_amount: number;
  cae: string | null;
  cae_due_date: string | null;
  description: string | null;
  origin: string;
  created_at: string;
  error: string | null;
  /** false para lo importado de ARCA: no hay invoice_id de Gateway para PDF/NC/cobro/adjuntos. */
  editable: boolean;
}

function naturalKey(tipo: number | null | undefined, ptoVta: number | null | undefined, numero: number | null | undefined) {
  return `${tipo}-${ptoVta}-${numero}`;
}

/**
 * Todos los comprobantes reales de la organización: emitidos por el Gateway (SimpleComm,
 * incluye cualquier source_app) + los importados desde "Mis Comprobantes" de ARCA, sin
 * duplicar los que ya están en ambos lados (misma clave natural tipo+puntoVenta+número).
 *
 * Es la fuente única tanto para el listado de Facturación como para los KPIs de la home —
 * antes cada uno consultaba solo al Gateway, así que apenas alguien importaba su historial de
 * ARCA (por ejemplo los Monotributistas que suben los últimos 12 meses), esos comprobantes
 * reales no aparecían ni en el listado ni en los totales, dando una imagen incompleta.
 */
export async function getComprobantesUnificados(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ComprobanteUnificado[]> {
  const gatewayRows: ComprobanteUnificado[] = [];
  const gatewayKeys = new Set<string>();

  try {
    const apiKey = await getGatewayKey(userId);
    let page = 1;
    let pages = 1;
    do {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) break;
      const json = await res.json();
      const rows: GatewayInvoiceRow[] = json.data ?? [];
      for (const r of rows) {
        gatewayRows.push({
          invoice_id: r.invoice_id,
          invoice_number: r.invoice_number,
          status: (r.status as ComprobanteUnificado['status']) ?? 'error',
          buyer_name: r.buyer_name,
          buyer_doc: r.buyer_doc ? r.buyer_doc.replace(/\D/g, '') || null : null,
          total_amount: Number(r.total_amount ?? 0),
          cae: r.cae,
          cae_due_date: r.cae_due_date,
          description: r.description,
          origin: r.source_app ?? 'simplecomm',
          created_at: r.created_at,
          error: r.error,
          editable: true,
        });
        if (r.status === 'issued') {
          gatewayKeys.add(naturalKey(r.invoice_type, r.pto_vta, r.invoice_number_int));
        }
      }
      pages = json.meta?.pages ?? 1;
      page += 1;
    } while (page <= pages && page <= 40);
  } catch {
    // Si el Gateway no responde, seguimos con lo importado de ARCA igual.
  }

  const { data: arcaRows } = await supabase
    .from('arca_sales_invoices')
    .select('id, tipoComprobante, puntoVenta, numeroComprobante, issueDate, receptorNombre, receptorCuit, totalAmount, cae')
    .eq('organizationId', userId);

  const arcaMapped: ComprobanteUnificado[] = (arcaRows ?? [])
    .filter(r => !gatewayKeys.has(naturalKey(r.tipoComprobante, r.puntoVenta, r.numeroComprobante)))
    .map(r => ({
      invoice_id: `arca-${r.id}`,
      invoice_number: `${String(r.puntoVenta).padStart(4, '0')}-${String(r.numeroComprobante).padStart(8, '0')}`,
      status: 'issued' as const,
      buyer_name: r.receptorNombre ?? 'Consumidor Final',
      buyer_doc: r.receptorCuit ? r.receptorCuit.replace(/\D/g, '') || null : null,
      total_amount: Number(r.totalAmount ?? 0),
      cae: r.cae,
      cae_due_date: null,
      description: null,
      origin: 'arca',
      created_at: r.issueDate ? `${r.issueDate}T12:00:00.000Z` : new Date().toISOString(),
      error: null,
      editable: false,
    }));

  return [...gatewayRows, ...arcaMapped].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
