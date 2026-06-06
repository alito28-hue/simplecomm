import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return { db: createAdminClient(), user };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, monthlyLimit, priceARS, description, isActive } = body;

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name         !== undefined) update.name         = name;
  if (monthlyLimit !== undefined) update.monthlyLimit = Number(monthlyLimit);
  if (priceARS     !== undefined) update.priceARS     = Number(priceARS);
  if (description  !== undefined) update.description  = description;
  if (isActive     !== undefined) update.isActive     = isActive;

  const { data, error } = await ctx.db
    .from('plans')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { count } = await ctx.db
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('planId', id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${count} cliente(s) tienen este plan activo.` },
      { status: 409 }
    );
  }

  const { error } = await ctx.db.from('plans').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
