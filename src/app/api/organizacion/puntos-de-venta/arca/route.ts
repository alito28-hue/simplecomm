import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gatewayApiKey = await getGatewayKey(user.id);
  if (!gatewayApiKey) {
    return NextResponse.json({ error: 'ARCA no está configurado para esta organización' }, { status: 409 });
  }

  const res = await fetch(`${GATEWAY_URL}/v1/wsfe/puntos-venta`, {
    headers: { 'Authorization': `Bearer ${gatewayApiKey}` },
    signal: AbortSignal.timeout(30_000),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error ?? 'Error al consultar ARCA' }, { status: 502 });

  return NextResponse.json(data);
}
