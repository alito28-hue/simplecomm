import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

interface ItemInput { productId?: string | null; description: string; quantity: number; unitPrice: number; }

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = supabase.from('quotes').select('*')
    .eq('organizationId', user.id).order('quoteNumber', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { buyerName, buyerDocType, buyerDocNumber, buyerEmail, validUntil, notes, items } = body as {
    buyerName: string; buyerDocType?: string; buyerDocNumber?: string; buyerEmail?: string;
    validUntil?: string; notes?: string; items: ItemInput[];
  };

  if (!buyerName?.trim()) return NextResponse.json({ error: 'El nombre del cliente es obligatorio' }, { status: 400 });
  const cleanItems = (items ?? []).filter(it => it.description?.trim() && it.quantity > 0);
  if (cleanItems.length === 0) return NextResponse.json({ error: 'Agregá al menos un ítem' }, { status: 400 });

  const totalAmount = cleanItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const now = new Date().toISOString();

  // Numeración simple por organización — no hay concurrencia real esperada en un negocio chico.
  const { data: last } = await supabase.from('quotes')
    .select('quoteNumber').eq('organizationId', user.id).order('quoteNumber', { ascending: false }).limit(1).maybeSingle();
  const quoteNumber = (last?.quoteNumber ?? 0) + 1;

  const quoteId = randomUUID();
  const { error: insertError } = await supabase.from('quotes').insert({
    id: quoteId,
    organizationId: user.id,
    quoteNumber,
    buyerName: buyerName.trim(),
    buyerDocType: buyerDocType || null,
    buyerDocNumber: buyerDocNumber || null,
    buyerEmail: buyerEmail || null,
    status: 'PENDIENTE',
    validUntil: validUntil || null,
    notes: notes || null,
    totalAmount: Math.round(totalAmount * 100) / 100,
    createdAt: now,
    updatedAt: now,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { error: itemsError } = await supabase.from('quote_items').insert(
    cleanItems.map((it, i) => ({
      id: randomUUID(),
      quoteId,
      productId: it.productId || null,
      description: it.description.trim(),
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      sortOrder: i,
    })),
  );
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json({ id: quoteId, quoteNumber }, { status: 201 });
}
