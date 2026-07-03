import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';
const CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return { db: createAdminClient(), user };
}

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await ctx.db
    .from('categorias_monotributo_vigentes')
    .select('*')
    .order('vigenteDesde', { ascending: false })
    .order('categoria', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/**
 * Carga una vigencia completa (las 11 categorías A-K para una misma fecha) de una sola vez,
 * tal como se publican en https://www.afip.gob.ar/monotributo/categorias.asp — no tiene
 * sentido cargar una categoría suelta porque ARCA siempre actualiza la escala entera junta.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const vigenteDesde = body.vigenteDesde as string;
  const montos = body.montos as Record<string, number>;

  if (!vigenteDesde) return NextResponse.json({ error: 'Falta la fecha de vigencia' }, { status: 400 });
  const faltantes = CATEGORIAS.filter(c => !montos?.[c] || Number(montos[c]) <= 0);
  if (faltantes.length) {
    return NextResponse.json({ error: `Faltan montos para: ${faltantes.join(', ')}` }, { status: 400 });
  }

  const rows = CATEGORIAS.map(categoria => ({
    categoria,
    topeIngresosBrutos: Number(montos[categoria]),
    vigenteDesde,
  }));

  const { error } = await ctx.db
    .from('categorias_monotributo_vigentes')
    .upsert(rows, { onConflict: 'categoria,vigenteDesde' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** Borra una vigencia completa (las 11 filas de esa fecha) — para corregir una carga errónea. */
export async function DELETE(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vigenteDesde = searchParams.get('vigenteDesde');
  if (!vigenteDesde) return NextResponse.json({ error: 'Falta vigenteDesde' }, { status: 400 });

  const { error } = await ctx.db
    .from('categorias_monotributo_vigentes')
    .delete()
    .eq('vigenteDesde', vigenteDesde);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
