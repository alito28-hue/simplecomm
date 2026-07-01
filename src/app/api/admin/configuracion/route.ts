import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFreeTierLimit } from '@/lib/usage';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return { db: createAdminClient(), user };
}

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const freeTierLimit = await getFreeTierLimit();
  return NextResponse.json({ freeTierLimit });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { freeTierLimit } = await req.json();
  const value = Number(freeTierLimit);
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
  }

  const { error } = await ctx.db.from('app_settings').upsert({
    key: 'free_tier_limit',
    value: String(Math.round(value)),
    updatedAt: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, freeTierLimit: Math.round(value) });
}
