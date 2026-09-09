import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Proveedores "conocidos" para autocompletar CUIT/nombre al cargar una compra — no es una
 * tabla propia, se deriva directo del historial de purchase_invoices (así nunca se
 * desincroniza: si el proveedor cambió de razón social, el último comprobante cargado ya
 * refleja el nombre correcto). Pensado para el caso típico de "siempre la misma estación de
 * servicio" — evita retipear el CUIT cada vez.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('purchase_invoices')
    .select('issuerCuit, issuerName, createdAt')
    .eq('organizationId', user.id)
    .not('issuerCuit', 'is', null)
    .neq('issuerCuit', '')
    .order('createdAt', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const seen = new Map<string, { cuit: string; nombre: string }>();
  for (const row of data ?? []) {
    if (!row.issuerCuit || seen.has(row.issuerCuit)) continue;
    seen.set(row.issuerCuit, { cuit: row.issuerCuit, nombre: row.issuerName || '(sin nombre)' });
  }

  return NextResponse.json({ data: Array.from(seen.values()).slice(0, 50) });
}
