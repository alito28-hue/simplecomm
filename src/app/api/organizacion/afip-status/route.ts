import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey } from '@/lib/gateway';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase
    .from('organizations')
    .select('cuit, afipConfigured, gatewayTenantId, gatewayApiKey, ptoVta')
    .eq('id', user.id)
    .maybeSingle();

  // Configured if org has explicit flags, own key, or falls back to global key (tenant 1)
  const gatewayKey = await getGatewayKey(user.id);
  const configured = !!(org?.afipConfigured || org?.gatewayTenantId || org?.gatewayApiKey || gatewayKey);

  return NextResponse.json({
    configured,
    cuitRepresentada: org?.cuit ?? undefined,
  });
}
