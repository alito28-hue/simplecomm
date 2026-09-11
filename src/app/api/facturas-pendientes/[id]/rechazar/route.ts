import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('pending_platform_invoices')
    .update({ status: 'REJECTED', resolvedAt: new Date().toISOString() })
    .eq('id', id).eq('organizationId', user.id).eq('status', 'PENDING')
    .select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'No encontrada o ya resuelta' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
