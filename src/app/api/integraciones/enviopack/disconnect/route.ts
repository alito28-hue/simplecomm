import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('integrations')
    .update({ status: 'DISCONNECTED', config: {} })
    .eq('organizationId', user.id)
    .eq('platform', 'ENVIOPACK');

  return NextResponse.json({ success: true });
}
