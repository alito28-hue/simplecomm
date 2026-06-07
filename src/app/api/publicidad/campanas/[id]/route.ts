import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data, error } = await supabase.from('ad_campaigns')
    .update({
      platform: body.platform,
      name: body.name.trim(),
      startDate: body.startDate,
      endDate: body.endDate || null,
      spend: body.spend ?? 0,
      notes: body.notes?.trim() || null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organizationId', user.id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('ad_campaigns')
    .delete()
    .eq('id', id)
    .eq('organizationId', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
