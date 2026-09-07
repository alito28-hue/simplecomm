import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anio = Number(req.nextUrl.searchParams.get('anio'));
  if (!anio) return NextResponse.json({ error: 'anio requerido' }, { status: 400 });

  const { data } = await supabase
    .from('ganancias_ajustes_ejercicio')
    .select('impuestoDeterminado, notas, updatedAt')
    .eq('organizationId', user.id)
    .eq('anio', anio)
    .maybeSingle();

  return NextResponse.json({ ajuste: data ?? null });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { anio, impuestoDeterminado, notas } = await req.json();
  if (!anio || impuestoDeterminado == null || Number.isNaN(Number(impuestoDeterminado))) {
    return NextResponse.json({ error: 'anio e impuestoDeterminado son requeridos' }, { status: 400 });
  }

  const { error } = await supabase.from('ganancias_ajustes_ejercicio').upsert({
    organizationId: user.id,
    anio: Number(anio),
    impuestoDeterminado: Number(impuestoDeterminado),
    notas: notas || null,
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'organizationId,anio' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anio = Number(req.nextUrl.searchParams.get('anio'));
  if (!anio) return NextResponse.json({ error: 'anio requerido' }, { status: 400 });

  await supabase.from('ganancias_ajustes_ejercicio').delete()
    .eq('organizationId', user.id).eq('anio', anio);

  return NextResponse.json({ ok: true });
}
