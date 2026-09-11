import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFreeTierLimit, getApiKeyDefaultLimit } from '@/lib/usage';

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

  const [freeTierLimit, apiKeyDefaultLimit] = await Promise.all([getFreeTierLimit(), getApiKeyDefaultLimit()]);
  return NextResponse.json({ freeTierLimit, apiKeyDefaultLimit });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { freeTierLimit, apiKeyDefaultLimit } = await req.json();
  const updates: { key: string; value: string; updatedAt: string }[] = [];
  const now = new Date().toISOString();
  const result: { freeTierLimit?: number; apiKeyDefaultLimit?: number } = {};

  if (freeTierLimit !== undefined) {
    const value = Number(freeTierLimit);
    if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    updates.push({ key: 'free_tier_limit', value: String(Math.round(value)), updatedAt: now });
    result.freeTierLimit = Math.round(value);
  }

  if (apiKeyDefaultLimit !== undefined) {
    const value = Number(apiKeyDefaultLimit);
    if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    updates.push({ key: 'api_key_default_limit', value: String(Math.round(value)), updatedAt: now });
    result.apiKeyDefaultLimit = Math.round(value);
  }

  if (updates.length === 0) return NextResponse.json({ error: 'Nada para guardar' }, { status: 400 });

  const { error } = await ctx.db.from('app_settings').upsert(updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...result });
}
