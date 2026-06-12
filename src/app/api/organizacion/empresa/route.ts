import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Buscar por id (que usamos como organizationId = user.id)
  const { data } = await supabase.from('organizations')
    .select('*').eq('id', user.id).maybeSingle();

  return NextResponse.json(data ?? null);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (typeof body.cuit === 'string') body.cuit = body.cuit.replace(/\D/g, '');
  const now = new Date().toISOString();

  // Verificar si ya existe
  const { data: existing } = await supabase.from('organizations')
    .select('id').eq('id', user.id).maybeSingle();

  let result;
  if (existing) {
    result = await supabase.from('organizations')
      .update({ ...body, updatedAt: now })
      .eq('id', user.id).select().single();
  } else {
    result = await supabase.from('organizations')
      .insert({ ...body, id: user.id, createdAt: now, updatedAt: now })
      .select().single();
  }

  if (result.error) {
    if (result.error.code === '23505' && result.error.message.includes('cuit')) {
      return NextResponse.json(
        { error: 'Ese CUIT/CUIL ya está registrado en otra cuenta. Si es un error, contactanos para resolverlo.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
