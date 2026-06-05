import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('integrations')
    .update({ status: 'DISCONNECTED', accessToken: null, refreshToken: null })
    .eq('organizationId', user.id)
    .eq('platform', 'MERCADO_PAGO');

  return NextResponse.json({ success: true });
}
