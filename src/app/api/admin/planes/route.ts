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

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await ctx.db
    .from('plans')
    .select('*')
    .order('priceARS', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, monthlyLimit, priceARS, description } = body;

  if (!name || !monthlyLimit || !priceARS) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const id = 'plan_' + name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const { data, error } = await ctx.db
    .from('plans')
    .insert({
      id,
      name,
      monthlyLimit: Number(monthlyLimit),
      priceARS: Number(priceARS),
      description: description || null,
      isActive: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
