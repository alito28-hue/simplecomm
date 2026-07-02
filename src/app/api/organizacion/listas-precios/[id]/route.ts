import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function assertOwnership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, listId: string) {
  const { data } = await supabase.from('price_lists').select('id').eq('id', listId).eq('organizationId', userId).maybeSingle();
  return !!data;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await assertOwnership(supabase, user.id, id))) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { name, isDefault } = await req.json();
  if (isDefault) {
    await supabase.from('price_lists').update({ isDefault: false }).eq('organizationId', user.id);
  }
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (isDefault !== undefined) update.isDefault = isDefault;

  const { data, error } = await supabase.from('price_lists').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await assertOwnership(supabase, user.id, id))) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { error } = await supabase.from('price_lists').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
