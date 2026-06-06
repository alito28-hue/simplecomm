import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase
    .from('organizations')
    .select('cuit, afipConfigured, gatewayTenantId, ptoVta')
    .eq('id', user.id)
    .maybeSingle();

  const configured = !!(org?.afipConfigured || org?.gatewayTenantId);

  return NextResponse.json({
    configured,
    cuitRepresentada: org?.cuit ?? undefined,
  });
}
