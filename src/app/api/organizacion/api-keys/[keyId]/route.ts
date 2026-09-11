import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GATEWAY_URL } from '@/lib/gateway';

const GATEWAY_ADMIN_SECRET = process.env.GATEWAY_ADMIN_SECRET ?? '';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
  const { keyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: org } = await supabase.from('organizations')
    .select('gatewayTenantId').eq('id', user.id).maybeSingle();
  if (!org?.gatewayTenantId) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

  const res = await fetch(`${GATEWAY_URL}/v1/admin/tenants/${org.gatewayTenantId}/keys/${keyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${GATEWAY_ADMIN_SECRET}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ error: data.error ?? 'No se pudo revocar la key' }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
