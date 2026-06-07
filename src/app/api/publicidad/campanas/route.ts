import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('organizationId', user.id)
    .order('startDate', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    platform: string; name: string; startDate: string; endDate?: string;
    spend: number; notes?: string;
  };

  if (!body.platform || !body.name?.trim() || !body.startDate) {
    return NextResponse.json({ error: 'Plataforma, nombre y fecha de inicio son requeridos' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase.from('ad_campaigns').insert({
    organizationId: user.id,
    platform: body.platform,
    name: body.name.trim(),
    startDate: body.startDate,
    endDate: body.endDate || null,
    spend: body.spend ?? 0,
    notes: body.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}
