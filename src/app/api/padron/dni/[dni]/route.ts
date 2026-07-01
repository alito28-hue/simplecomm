import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSharedGatewayKey, GATEWAY_URL } from '@/lib/gateway';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  const { dni } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clean = dni.replace(/\D/g, '');
  if (!/^\d{7,8}$/.test(clean)) {
    return NextResponse.json({ error: 'DNI inválido' }, { status: 400 });
  }

  const gatewayApiKey = getSharedGatewayKey();

  const res = await fetch(`${GATEWAY_URL}/v1/padron/por-dni/${clean}`, {
    headers: { 'Authorization': `Bearer ${gatewayApiKey}` },
    signal: AbortSignal.timeout(30_000),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? 'Error consultando el Padrón' },
      { status: res.status === 404 ? 404 : 502 }
    );
  }

  return NextResponse.json(data);
}
