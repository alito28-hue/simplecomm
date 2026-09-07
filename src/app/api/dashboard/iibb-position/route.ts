import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Percepciones de IIBB que el banco adelanta al acreditar cobros (SIRCREB), agrupadas por
 * jurisdicción — IIBB es un impuesto provincial, cada jurisdicción lleva su propia cuenta
 * corriente y no se compensan entre sí (ver spec_costos_bancarios_cobro_y_posicion_iibb.md).
 * Por ahora es solo "cuánto ya tenés adelantado" — no calcula el neto porque el sistema
 * todavía no carga las DDJJ mensuales de IIBB (impuesto realmente determinado).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase.from('organizations')
    .select('fiscalTreatment, province')
    .eq('id', user.id).maybeSingle();

  if (org?.fiscalTreatment !== 'RESPONSABLE_INSCRIPTO') {
    return NextResponse.json({ applicable: false });
  }

  const year = new Date().getFullYear();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const { data } = await supabase
    .from('movimientos_cobro')
    .select('monto, jurisdiccionIIBB')
    .eq('organizationId', user.id)
    .eq('tipo', 'PERCEPCION_IIBB_BANCO')
    .gte('fechaCobro', from)
    .lte('fechaCobro', to);

  const porJurisdiccion = new Map<string, number>();
  for (const r of data ?? []) {
    const jurisdiccion = r.jurisdiccionIIBB || org.province || 'Sin especificar';
    porJurisdiccion.set(jurisdiccion, (porJurisdiccion.get(jurisdiccion) ?? 0) + Number(r.monto ?? 0));
  }

  const jurisdicciones = Array.from(porJurisdiccion.entries())
    .map(([jurisdiccion, percepcionesAcumuladas]) => ({
      jurisdiccion,
      percepcionesAcumuladas: Math.round(percepcionesAcumuladas * 100) / 100,
    }))
    .sort((a, b) => b.percepcionesAcumuladas - a.percepcionesAcumuladas);

  return NextResponse.json({
    applicable: true,
    year,
    jurisdicciones,
    totalAcumulado: Math.round(jurisdicciones.reduce((s, j) => s + j.percepcionesAcumuladas, 0) * 100) / 100,
  });
}
