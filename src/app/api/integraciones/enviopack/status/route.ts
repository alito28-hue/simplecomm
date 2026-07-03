import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false });

  const { data } = await supabase.from('integrations')
    .select('status, config')
    .eq('organizationId', user.id)
    .eq('platform', 'ENVIOPACK')
    .maybeSingle();

  return NextResponse.json({
    connected: data?.status === 'CONNECTED',
    direccionEnvioId: data?.config?.direccionEnvioId ?? null,
  });
}
