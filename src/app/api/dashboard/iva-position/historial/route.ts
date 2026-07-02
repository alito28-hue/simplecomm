import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeIvaPosition } from '@/lib/iva-position';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Grupos de vencimiento de ARCA por terminación de CUIT (agrupación estándar, no cambia
// entre regímenes). El día exacto de cada mes lo define ARCA — no lo calculamos acá para
// evitar mostrar una fecha incorrecta (mismo criterio que Calendario de Vencimientos).
const GRUPOS: { digitos: string; label: string }[] = [
  { digitos: '0,1', label: 'Grupo 1' },
  { digitos: '2,3', label: 'Grupo 2' },
  { digitos: '4,5', label: 'Grupo 3' },
  { digitos: '6,7', label: 'Grupo 4' },
  { digitos: '8,9', label: 'Grupo 5' },
];

const MONTHS_BACK = 12;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase.from('organizations').select('fiscalTreatment, cuit').eq('id', user.id).maybeSingle();
  if (org?.fiscalTreatment !== 'RESPONSABLE_INSCRIPTO') {
    return NextResponse.json({ applicable: false });
  }

  const cuit = (org.cuit ?? '').replace(/\D/g, '');
  const lastDigit = cuit ? cuit.slice(-1) : null;
  const vencimientoGrupo = lastDigit ? (GRUPOS.find(g => g.digitos.split(',').includes(lastDigit))?.label ?? null) : null;

  const now = new Date();
  const ranges: { year: number; month: number; from: string; to: string }[] = [];
  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const isCurrent = i === 0;
    const to = isCurrent ? now.toISOString().slice(0, 10) : `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    ranges.push({ year, month, from, to });
  }

  const results = await Promise.all(
    ranges.map(r => computeIvaPosition(supabase, user.id, r.from, r.to)),
  );

  const months = ranges.map((r, i) => ({
    year: r.year,
    month: r.month + 1,
    monthLabel: MESES[r.month],
    salesIva: results[i].salesIva,
    purchasesIva: results[i].purchasesIva,
    position: results[i].position,
  }));

  return NextResponse.json({ applicable: true, vencimientoGrupo, months });
}
