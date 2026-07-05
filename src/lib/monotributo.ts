import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

interface GatewayInvoice {
  status: string;
  total_amount: number;
  invoice_type: number | null;
  pto_vta: number | null;
  invoice_number_int: number | null;
  created_at?: string;
}

function naturalKey(tipo: number | null | undefined, ptoVta: number | null | undefined, numero: number | null | undefined) {
  return `${tipo}-${ptoVta}-${numero}`;
}

export type MonotributoLevel = 'green' | 'yellow' | 'red' | 'exclusion';

export interface VentanaFormal {
  label: string;
  from: string;
  to: string;
  total: number;
  categoriaSugerida: string | null;
}

export interface MonotributoStatus {
  applicable: boolean;
  categoria?: string;
  tope?: number;
  facturacion12m?: number;
  porcentaje?: number;
  level?: MonotributoLevel;
  categoriaEfectiva?: string | null;
  lastSalesImportAt?: string | null;
  topeEfectivo?: number | null;
  porcentajeEfectivo?: number | null;
  vigenteDesde?: string;
  topeMaximo?: number;
  ventanaFormal?: VentanaFormal;
  reason?: string;
}

/**
 * Facturación real total dentro de un rango de fechas [from, to] (YYYY-MM-DD), reconstruida
 * igual que IVA Ventas: facturas emitidas por el Gateway en vivo + lo importado de ARCA
 * "emitidos" que no esté ya en el Gateway (dedup por clave natural), para cubrir los tres
 * escenarios: todo por Simplecomm, todo importado, o combinado.
 */
async function computeFacturacionEnVentana(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  from: string,
  to: string,
): Promise<number> {
  let total = 0;
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
        total += Number(inv.total_amount ?? 0);
        gatewayKeys.add(naturalKey(inv.invoice_type, inv.pto_vta, inv.invoice_number_int));
      }
      pages = json.meta?.pages ?? 1;
      page += 1;
    } while (page <= pages && page <= 40);
  } catch {
    // Si el Gateway no responde, seguimos con lo que haya importado de ARCA.
  }

  const { data: arcaSales } = await supabase
    .from('arca_sales_invoices')
    .select('tipoComprobante, puntoVenta, numeroComprobante, totalAmount')
    .eq('organizationId', userId)
    .gte('issueDate', from)
    .lte('issueDate', to);

  for (const row of arcaSales ?? []) {
    const key = naturalKey(row.tipoComprobante, row.puntoVenta, row.numeroComprobante);
    if (gatewayKeys.has(key)) continue;
    total += Number(row.totalAmount ?? 0);
  }

  return Math.round(total * 100) / 100;
}

/**
 * ARCA recategoriza dos veces al año, con un corte fijo (no móvil):
 * - Febrero: ventana 1/feb (año-1) a 31/ene (año).
 * - Agosto: ventana 1/jul (año-1) a 30/jun (año).
 * Devuelve la ventana formal más reciente ya cerrada a la fecha de hoy.
 */
function ventanaFormalMasReciente(today: Date): { label: string; from: string; to: string } {
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12

  if (month >= 2 && month <= 7) {
    return { label: `Recategorización de Febrero ${year}`, from: `${year - 1}-02-01`, to: `${year}-01-31` };
  }
  if (month >= 8) {
    return { label: `Recategorización de Agosto ${year}`, from: `${year - 1}-07-01`, to: `${year}-06-30` };
  }
  // month === 1
  return { label: `Recategorización de Agosto ${year - 1}`, from: `${year - 2}-07-01`, to: `${year - 1}-06-30` };
}

/** Categoría más chica (por tope) cuyo tope alcanza para cubrir el monto — null si supera hasta la K. */
function categoriaQueAlcanza(escalaAsc: { categoria: string; topeIngresosBrutos: number }[], monto: number) {
  return escalaAsc.find(c => Number(c.topeIngresosBrutos) >= monto) ?? null;
}

export async function computeMonotributoStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<MonotributoStatus> {
  const { data: org } = await supabase
    .from('organizations')
    .select('fiscalTreatment, categoriaMonotributo')
    .eq('id', userId)
    .maybeSingle();

  if (org?.fiscalTreatment !== 'MONOTRIBUTISTA') {
    return { applicable: false, reason: 'not_monotributista' };
  }
  if (!org.categoriaMonotributo) {
    return { applicable: false, reason: 'no_categoria' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: vigencia } = await supabase
    .from('categorias_monotributo_vigentes')
    .select('categoria, topeIngresosBrutos, vigenteDesde')
    .lte('vigenteDesde', today)
    .order('vigenteDesde', { ascending: false })
    .limit(200);

  if (!vigencia || vigencia.length === 0) {
    return { applicable: false, reason: 'sin_escala_cargada' };
  }

  const vigenteDesde = vigencia[0].vigenteDesde;
  const escalaActual = vigencia
    .filter(v => v.vigenteDesde === vigenteDesde)
    .sort((a, b) => Number(a.topeIngresosBrutos) - Number(b.topeIngresosBrutos));

  const propia = escalaActual.find(v => v.categoria === org.categoriaMonotributo);
  if (!propia) {
    return { applicable: false, reason: 'categoria_sin_tope_en_escala' };
  }
  const topeMaximo = Number(escalaActual[escalaActual.length - 1].topeIngresosBrutos); // Categoría K = tope de exclusión

  // --- Ventana móvil de 365 días (chequeo diario, como exige ARCA) ---
  const hoy = new Date();
  const hace365 = new Date(hoy);
  hace365.setDate(hace365.getDate() - 365);
  const facturacion12m = await computeFacturacionEnVentana(
    supabase, userId, hace365.toISOString().slice(0, 10), hoy.toISOString().slice(0, 10),
  );

  const tope = Number(propia.topeIngresosBrutos);
  const porcentaje = tope > 0 ? Math.round((facturacion12m / tope) * 1000) / 10 : 0;

  let level: MonotributoLevel;
  let categoriaEfectiva: string | null = null;
  let topeEfectivo: number | null = null;
  let porcentajeEfectivo: number | null = null;

  if (facturacion12m <= tope) {
    // Dentro de su categoría declarada — nunca hay que buscar una "efectiva" acá (si se
    // buscara sin este chequeo, con facturación baja siempre "encontraría" la Categoría A,
    // la más chica, y diría por error que se pasó de categoría).
    level = porcentaje >= 80 ? 'yellow' : 'green';
  } else {
    // Se pasó del tope de su categoría declarada — buscar la categoría superior que
    // realmente cubre lo facturado, o ninguna si superó hasta la K (exclusión).
    const efectiva = categoriaQueAlcanza(escalaActual, facturacion12m);
    if (!efectiva) {
      level = 'exclusion';
    } else {
      level = 'red';
      categoriaEfectiva = efectiva.categoria;
      topeEfectivo = Number(efectiva.topeIngresosBrutos);
      porcentajeEfectivo = topeEfectivo > 0 ? Math.round((facturacion12m / topeEfectivo) * 1000) / 10 : 0;
    }
  }

  // --- Ventana fija de la última recategorización formal (Feb/Ago) ---
  // Mismo criterio que arriba: solo tiene sentido "sugerir" una categoría distinta si lo
  // facturado en esa ventana superó el tope de la categoría declarada — si no, cae dentro
  // de la propia, sin importar cuán por debajo del tope esté.
  const ventana = ventanaFormalMasReciente(hoy);
  const totalVentanaFormal = await computeFacturacionEnVentana(supabase, userId, ventana.from, ventana.to);
  const categoriaSugerida = totalVentanaFormal > tope
    ? categoriaQueAlcanza(escalaActual, totalVentanaFormal)?.categoria ?? null
    : org.categoriaMonotributo;

  const { data: lastImport } = await supabase
    .from('arca_import_log')
    .select('importedAt')
    .eq('organizationId', userId)
    .eq('importType', 'emitidos')
    .order('importedAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    applicable: true,
    categoria: org.categoriaMonotributo,
    tope,
    facturacion12m,
    porcentaje,
    level,
    categoriaEfectiva,
    lastSalesImportAt: lastImport?.importedAt ?? null,
    topeEfectivo,
    porcentajeEfectivo,
    vigenteDesde,
    topeMaximo,
    ventanaFormal: {
      ...ventana,
      total: totalVentanaFormal,
      categoriaSugerida,
    },
  };
}
