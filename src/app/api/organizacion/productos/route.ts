import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  const { data, error } = await supabase.from('products').select('*')
    .eq('organizationId', user.id).order('code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtro en JS, no con .or() de Supabase: una descripción con coma o paréntesis rompe la
  // sintaxis del filtro de PostgREST (ver mismo fix en /api/organizacion/compras).
  let rows = data ?? [];
  if (q) {
    const qLower = q.toLowerCase();
    rows = rows.filter(p => p.code?.toLowerCase().includes(qLower) || p.description?.toLowerCase().includes(qLower));
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('products').insert({
    id: randomUUID(),
    ...body,
    organizationId: user.id,
    createdAt: now,
    updatedAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
