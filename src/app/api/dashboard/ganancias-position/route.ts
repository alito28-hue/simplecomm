import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeIvaPosition } from '@/lib/iva-position';
import { fiscalYearRange, fiscalYearMonths } from '@/lib/ganancias-position';
import { porcentajeComputableLey25413 } from '@/lib/ley25413';

/**
 * Retenciones/percepciones sufridas al cobrar (ver retenciones_percepciones, clasificadas por
 * tipoImpuesto). Solo las etiquetadas GANANCIAS son un crédito válido contra nuestro propio
 * Impuesto a las Ganancias — IVA, IIBB y SIN_CLASIFICAR se devuelven aparte, sin aplicar,
 * porque compensan otro impuesto o todavía no se sabe cuál (ver spec_retenciones_percepciones_ganancias.md).
 */
async function sumRetencionesVentas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  from: string,
  to: string,
): Promise<{ ganancias: number; sinAplicar: number }> {
  const { data } = await supabase
    .from('retenciones_percepciones')
    .select('monto, tipoImpuesto')
    .eq('organizationId', userId)
    .not('invoiceId', 'is', null)
    .gte('fecha', from)
    .lte('fecha', to);

  let ganancias = 0;
  let sinAplicar = 0;
  for (const r of data ?? []) {
    const monto = Number(r.monto ?? 0);
    if (r.tipoImpuesto === 'GANANCIAS') ganancias += monto;
    else sinAplicar += monto;
  }
  return {
    ganancias: Math.round(ganancias * 100) / 100,
    sinAplicar: Math.round(sinAplicar * 100) / 100,
  };
}

/**
 * Impuesto a los Créditos y Débitos (Ley 25413) que el banco descuenta automáticamente al
 * acreditar un cobro — un % es pago a cuenta confirmado de Ganancias (según categoría Pyme),
 * el resto es un costo bancario real pero su deducibilidad exacta de la base imponible no
 * está confirmada, así que NO se resta de la ganancia usada para el impuesto — solo se
 * muestra aparte como "resultado real" informativo (ver spec_costos_bancarios_cobro_y_posicion_iibb.md).
 */
async function sumLey25413(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  from: string,
  to: string,
  porcentajeComputable: number,
): Promise<{ total: number; computable: number; noComputable: number }> {
  const { data } = await supabase
    .from('movimientos_cobro')
    .select('monto')
    .eq('organizationId', userId)
    .in('tipo', ['LEY25413_CREDITO', 'LEY25413_DEBITO'])
    .gte('fechaCobro', from)
    .lte('fechaCobro', to);

  const total = (data ?? []).reduce((sum, r) => sum + Number(r.monto ?? 0), 0);
  const computable = total * porcentajeComputable;
  return {
    total: Math.round(total * 100) / 100,
    computable: Math.round(computable * 100) / 100,
    noComputable: Math.round((total - computable) * 100) / 100,
  };
}

/**
 * Comisión que cobra una financiera por descontar un cheque — gasto financiero genuino, no
 * un impuesto (no hay "% computable" como en Ley 25413). Solo baja el resultado real, nunca
 * la base imponible de Ganancias hasta confirmar su tratamiento con el contador.
 */
async function sumComisionFinanciera(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  from: string,
  to: string,
): Promise<number> {
  const { data } = await supabase
    .from('movimientos_cobro')
    .select('monto')
    .eq('organizationId', userId)
    .eq('tipo', 'COMISION_FINANCIERA')
    .gte('fechaCobro', from)
    .lte('fechaCobro', to);

  return Math.round((data ?? []).reduce((sum, r) => sum + Number(r.monto ?? 0), 0) * 100) / 100;
}

interface OrgFiscalConfig {
  cierreFiscalMes: number;
  alicuotaGanancias: number | null;
  categoriaPyme: string | null;
}

/**
 * Cálculo completo de un ejercicio fiscal puntual (ganancia, impuesto estimado, créditos
 * computables). Se usa tanto para el ejercicio que se está mostrando como para el ejercicio
 * inmediato anterior (base de los anticipos — ver ANTICIPOS_PORCENTAJE más abajo).
 */
async function computeEjercicio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  org: OrgFiscalConfig,
  ejerciciosAtras: number,
) {
  const { from, to, label, endYear } = fiscalYearRange(org.cierreFiscalMes, ejerciciosAtras);
  const pos = await computeIvaPosition(supabase, userId, from, to);

  const ganancia = Math.round((pos.salesNet - pos.purchasesNet) * 100) / 100;
  const alicuota = org.alicuotaGanancias !== null ? Number(org.alicuotaGanancias) : null;
  const impuestoEstimado = alicuota !== null ? Math.round(ganancia * (alicuota / 100) * 100) / 100 : null;
  const retencionesPercepciones = Math.round((pos.purchasesRetenciones + pos.purchasesPercepciones) * 100) / 100;
  const porcentajeComputable = porcentajeComputableLey25413(org.categoriaPyme);

  const [retVentas, ley25413, comisionFinanciera, ajuste] = await Promise.all([
    sumRetencionesVentas(supabase, userId, from, to),
    sumLey25413(supabase, userId, from, to, porcentajeComputable),
    sumComisionFinanciera(supabase, userId, from, to),
    supabase.from('ganancias_ajustes_ejercicio').select('impuestoDeterminado, notas, updatedAt')
      .eq('organizationId', userId).eq('anio', endYear).maybeSingle(),
  ]);
  const creditoGanancias = Math.round((retVentas.ganancias + ley25413.computable) * 100) / 100;
  const saldoAPagarAuto = impuestoEstimado !== null
    ? Math.round((impuestoEstimado - creditoGanancias) * 100) / 100
    : null;
  // Un contador puede haber ajustado a mano el resultado del balance real (deducciones,
  // quebrantos, amortizaciones que SimpleComm no contempla) — cuando existe ese ajuste,
  // reemplaza la estimación automática como "impuesto determinado" de este ejercicio, tanto
  // para mostrarlo acá como para la base de los anticipos del ejercicio siguiente.
  const ajusteRow = ajuste.data;
  const saldoAPagarEsManual = ajusteRow != null;
  const saldoAPagar = saldoAPagarEsManual ? Number(ajusteRow!.impuestoDeterminado) : saldoAPagarAuto;
  const resultadoRealEstimado = Math.round((ganancia - ley25413.noComputable - comisionFinanciera) * 100) / 100;

  // Con datos reales (ventas o compras) en el período — distingue "ejercicio sin actividad
  // cargada todavía" (empresa nueva, o antes de sumarse a SimpleComm) de "ejercicio con
  // resultado $0 real", para no calcular anticipos sobre una base vacía sin sentido.
  const hasData = pos.salesNet !== 0 || pos.purchasesNet !== 0;

  return {
    from, to, label, endYear,
    ventasNetas: pos.salesNet,
    comprasNetas: pos.purchasesNet,
    ganancia,
    alicuota,
    impuestoEstimado,
    retenciones: Math.round(pos.purchasesRetenciones * 100) / 100,
    percepciones: Math.round(pos.purchasesPercepciones * 100) / 100,
    retencionesPercepciones,
    retencionGananciasVentas: retVentas.ganancias,
    saldoAPagarAuto,
    saldoAPagarEsManual,
    ajusteNotas: ajusteRow?.notas ?? null,
    retencionesVentasSinAplicar: retVentas.sinAplicar,
    ley25413Total: ley25413.total,
    ley25413Computable: ley25413.computable,
    ley25413NoComputable: ley25413.noComputable,
    comisionFinanciera,
    porcentajeComputable,
    resultadoRealEstimado,
    saldoAPagar,
    hasData,
  };
}

// Régimen general vigente (RG AFIP/ARCA 5211 y modif.): 9 anticipos, cada uno el 11,11% del
// impuesto determinado del ejercicio fiscal INMEDIATO ANTERIOR ya cerrado (neto de retenciones
// computables y otros pagos a cuenta de ESE período) — no del ejercicio en curso. Confirmado
// contra afip.gob.ar/gananciasYBienes/ganancias/personas-juridicas/declaracion-jurada/anticipos.asp
// el 2026-09-07. Si ARCA cambia el % en el futuro, actualizar acá.
const ANTICIPOS_CANTIDAD = 9;
const ANTICIPOS_PORCENTAJE = 0.1111;
const ANTICIPOS_MONTO_MINIMO = 2500;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase.from('organizations')
    .select('fiscalTreatment, cierreFiscalMes, alicuotaGanancias, categoriaPyme')
    .eq('id', user.id).maybeSingle();

  if (org?.fiscalTreatment !== 'RESPONSABLE_INSCRIPTO') {
    return NextResponse.json({ applicable: false });
  }
  if (!org.cierreFiscalMes) {
    return NextResponse.json({ applicable: true, configured: false });
  }

  const { searchParams } = new URL(req.url);
  const ejerciciosAtras = Math.max(0, Number(searchParams.get('ejercicio') ?? '0'));

  const [actual, anterior] = await Promise.all([
    computeEjercicio(supabase, user.id, org, ejerciciosAtras),
    computeEjercicio(supabase, user.id, org, ejerciciosAtras + 1),
  ]);

  const meses = await Promise.all(
    fiscalYearMonths(org.cierreFiscalMes, ejerciciosAtras).map(async m => {
      const [mPos, mRetVentas, mLey25413] = await Promise.all([
        computeIvaPosition(supabase, user.id, m.from, m.to),
        sumRetencionesVentas(supabase, user.id, m.from, m.to),
        sumLey25413(supabase, user.id, m.from, m.to, actual.porcentajeComputable),
      ]);
      const mGanancia = Math.round((mPos.salesNet - mPos.purchasesNet) * 100) / 100;
      return {
        year: m.year,
        month: m.month,
        label: m.label,
        ventasNetas: mPos.salesNet,
        comprasNetas: mPos.purchasesNet,
        ganancia: mGanancia,
        retencionesPercepciones: Math.round((mPos.purchasesRetenciones + mPos.purchasesPercepciones) * 100) / 100,
        retencionGananciasVentas: mRetVentas.ganancias,
        ley25413Computable: mLey25413.computable,
        ley25413NoComputable: mLey25413.noComputable,
      };
    }),
  );

  // Anticipos del ejercicio consultado, en base al ejercicio INMEDIATO ANTERIOR ya cerrado.
  // Si ese ejercicio anterior no tiene actividad cargada (empresa nueva / recién sumada a
  // SimpleComm), no hay base real para anticipos — no se inventa un monto.
  const baseAnticipo = anterior.saldoAPagar ?? null;
  const anticipoAplica = anterior.hasData && baseAnticipo !== null && baseAnticipo >= ANTICIPOS_MONTO_MINIMO;
  const anticipo = anticipoAplica ? {
    aplica: true,
    ejercicioBase: anterior.label,
    ejercicioBaseAnio: anterior.endYear,
    baseImponible: baseAnticipo,
    baseAuto: anterior.saldoAPagarAuto,
    baseEsManual: anterior.saldoAPagarEsManual,
    cantidadCuotas: ANTICIPOS_CANTIDAD,
    porcentaje: ANTICIPOS_PORCENTAJE,
    montoPorCuota: Math.round((baseAnticipo as number) * ANTICIPOS_PORCENTAJE * 100) / 100,
  } : {
    aplica: false,
    ejercicioBase: anterior.label,
    ejercicioBaseAnio: anterior.endYear,
    baseAuto: anterior.saldoAPagarAuto,
    sinEjercicioAnteriorCerrado: !anterior.hasData,
  };

  return NextResponse.json({
    applicable: true,
    configured: true,
    ejercicio: { label: actual.label, from: actual.from, to: actual.to, anio: actual.endYear },
    ventasNetas: actual.ventasNetas,
    comprasNetas: actual.comprasNetas,
    ganancia: actual.ganancia,
    alicuota: actual.alicuota,
    impuestoEstimado: actual.impuestoEstimado,
    retenciones: actual.retenciones,
    percepciones: actual.percepciones,
    retencionGananciasVentas: actual.retencionGananciasVentas,
    retencionesVentasSinAplicar: actual.retencionesVentasSinAplicar,
    ley25413Total: actual.ley25413Total,
    ley25413Computable: actual.ley25413Computable,
    ley25413NoComputable: actual.ley25413NoComputable,
    comisionFinanciera: actual.comisionFinanciera,
    porcentajeComputable: actual.porcentajeComputable,
    resultadoRealEstimado: actual.resultadoRealEstimado,
    saldoAPagar: actual.saldoAPagar,
    saldoAPagarAuto: actual.saldoAPagarAuto,
    saldoAPagarEsManual: actual.saldoAPagarEsManual,
    ajusteNotas: actual.ajusteNotas,
    anticipo,
    meses,
  });
}
