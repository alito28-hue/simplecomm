import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page   = searchParams.get('page')   ?? '1';
  const limit  = searchParams.get('limit')  ?? '20';
  const status = searchParams.get('status') ?? '';

  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);

  const apiKey = await getGatewayKey(user.id);

  const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error }, { status: res.status });
  return NextResponse.json(data);
}
