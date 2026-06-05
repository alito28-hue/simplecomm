import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false });

  const { data } = await supabase.from('integrations')
    .select('status')
    .eq('organizationId', user.id)
    .eq('platform', 'TIENDANUBE')
    .single();

  return NextResponse.json({ connected: data?.status === 'CONNECTED' });
}
