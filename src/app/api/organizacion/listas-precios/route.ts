import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('price_lists').select('*')
    .eq('organizationId', user.id).order('createdAt');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, isDefault } = await req.json();
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

  if (isDefault) {
    await supabase.from('price_lists').update({ isDefault: false }).eq('organizationId', user.id);
  }

  const { data, error } = await supabase.from('price_lists').insert({
    id: randomUUID(),
    organizationId: user.id,
    name,
    isDefault: !!isDefault,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
