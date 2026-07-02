import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: list } = await supabase.from('price_lists').select('id').eq('id', id).eq('organizationId', user.id).maybeSingle();
  if (!list) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { data, error } = await supabase.from('price_list_items')
    .select('id, productId, price, products(code, description, netPrice)')
    .eq('priceListId', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: list } = await supabase.from('price_lists').select('id').eq('id', id).eq('organizationId', user.id).maybeSingle();
  if (!list) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { productId, price } = await req.json();
  if (!productId || price === undefined) return NextResponse.json({ error: 'productId y price requeridos' }, { status: 400 });

  const { data: product } = await supabase.from('products').select('id').eq('id', productId).eq('organizationId', user.id).maybeSingle();
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

  const { data, error } = await supabase.from('price_list_items')
    .upsert({ priceListId: id, productId, price }, { onConflict: 'priceListId,productId' })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
