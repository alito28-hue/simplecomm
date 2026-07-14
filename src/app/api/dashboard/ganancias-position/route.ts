import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeIvaPosition } from '@/lib/iva-position';
import { fiscalYearRange } from '@/lib/ganancias-position';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase.from('organizations')
    .select('fiscalTreatment, cierreFiscalMes, alicuotaGanancias')
    .eq('id', user.id).maybeSingle();

  if (org?.fiscalTreatment !== 'RESPONSABLE_INSCRIPTO') {
    return NextResponse.json({ applicable: false });
  }
  if (!org.cierreFiscalMes) {
    return NextResponse.json({ applicable: true, configured: false });
  }

  const { searchParams } = new URL(req.url);
  const ejerciciosAtras = Math.max(0, Number(searchParams.get('ejercicio') ?? '0'));

  const { from, to, label } = fiscalYearRange(org.cierreFiscalMes, ejerciciosAtras);
  const pos = await computeIvaPosition(supabase, user.id, from, to);

  const ganancia = Math.round((pos.salesNet - pos.purchasesNet) * 100) / 100;
  const alicuota = org.alicuotaGanancias !== null ? Number(org.alicuotaGanancias) : null;
  const impuestoEstimado = alicuota !== null ? Math.round(ganancia * (alicuota / 100) * 100) / 100 : null;

  return NextResponse.json({
    applicable: true,
    configured: true,
    ejercicio: { label, from, to },
    ventasNetas: pos.salesNet,
    comprasNetas: pos.purchasesNet,
    ganancia,
    alicuota,
    impuestoEstimado,
  });
}
