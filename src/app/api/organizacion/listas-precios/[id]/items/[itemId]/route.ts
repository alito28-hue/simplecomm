import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: list } = await supabase.from('price_lists').select('id').eq('id', id).eq('organizationId', user.id).maybeSingle();
  if (!list) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { error } = await supabase.from('price_list_items').delete().eq('id', itemId).eq('priceListId', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
