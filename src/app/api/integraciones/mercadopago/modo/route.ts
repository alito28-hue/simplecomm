import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_MODES = new Set(['AUTOMATIC', 'CONFIRMATION', 'PAUSED']);

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { mode } = await req.json();
  if (!VALID_MODES.has(mode)) return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 });

  const { error } = await supabase.from('integrations')
    .update({ mode, updatedAt: new Date().toISOString() })
    .eq('organizationId', user.id).eq('platform', 'MERCADO_PAGO');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, mode });
}
