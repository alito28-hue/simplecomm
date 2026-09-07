import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeIvaPosition } from '@/lib/iva-position';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTHS_BACK = 12;

// Ganancia mes a mes (ventas netas menos compras netas) — la misma cuenta que ya se muestra
// en el detalle de un mes puntual de Rentabilidad, solo que acá se listan los últimos 12
// meses juntos para no tener que ir mes por mes con el selector para verlos todos.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    ventasNetas: results[i].salesNet,
    comprasNetas: results[i].purchasesNet,
    ganancia: Math.round((results[i].salesNet - results[i].purchasesNet) * 100) / 100,
  }));

  return NextResponse.json({ months });
}
