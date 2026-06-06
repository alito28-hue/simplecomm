import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auth check with regular client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.formData().catch(() => null);
  const planId = body?.get('planId') as string | null
    ?? (await req.json().catch(() => ({}))).planId;

  if (!planId) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  // Use admin client to bypass RLS
  const db = createAdminClient();

  // Validate plan exists in DB
  const { data: plan } = await db.from('plans').select('id').eq('id', planId).single();
  if (!plan) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 400 });
  }

  const { error } = await db.from('organizations')
    .update({ planId, updatedAt: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.redirect(new URL(`/mayor/clientes/${id}`, req.url));
}
