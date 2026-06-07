import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('external_revenues')
    .select('*')
    .eq('organizationId', user.id)
    .order('periodStart', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revenues: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    periodStart: string; periodEnd: string; source: string; amount: number; notes?: string;
  };

  if (!body.periodStart || !body.periodEnd || !body.source?.trim()) {
    return NextResponse.json({ error: 'Período y fuente son requeridos' }, { status: 400 });
  }

  const { data, error } = await supabase.from('external_revenues').insert({
    organizationId: user.id,
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
    source: body.source.trim(),
    amount: body.amount ?? 0,
    notes: body.notes?.trim() || null,
    createdAt: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revenue: data });
}
