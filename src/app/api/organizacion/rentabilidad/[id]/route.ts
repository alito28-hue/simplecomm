import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Permite completar a mano el costo unitario y/o el costo de logística de un renglón de venta ya registrado. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.unitCost !== undefined) update.unitCost = body.unitCost === '' ? null : Number(body.unitCost);
  if (body.shippingCost !== undefined) {
    update.shippingCost = body.shippingCost === '' ? null : Number(body.shippingCost);
    update.shippingCostSource = update.shippingCost === null ? null : 'manual';
  }

  const { data, error } = await supabase.from('venta_items')
    .update(update)
    .eq('id', id).eq('organizationId', user.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
