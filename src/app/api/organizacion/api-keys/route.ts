import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GATEWAY_URL } from '@/lib/gateway';

const GATEWAY_ADMIN_SECRET = process.env.GATEWAY_ADMIN_SECRET ?? '';

// Cupo por defecto de una key de "Plan API" autogenerada — pensado para uso directo de un
// negocio chico/e-commerce, entre el plan Pro (150) y Enterprise (1500) del dashboard. Es
// independiente del límite de comprobantes del dashboard (ver enforceApiKeyQuota en el
// Gateway) — si un cliente necesita más, se ajusta a mano vía soporte.
const DEFAULT_API_KEY_MONTHLY_LIMIT = 500;

async function resolveTenantId(organizationId: string) {
  const supabase = await createClient();
  const { data: org } = await supabase.from('organizations')
    .select('gatewayTenantId').eq('id', organizationId).maybeSingle();
  return org?.gatewayTenantId ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await resolveTenantId(user.id);
  if (!tenantId) return NextResponse.json({ keys: [], tenantReady: false });

  const res = await fetch(`${GATEWAY_URL}/v1/admin/tenants/${tenantId}/keys`, {
    headers: { Authorization: `Bearer ${GATEWAY_ADMIN_SECRET}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return NextResponse.json({ error: 'No se pudieron cargar las API keys' }, { status: 502 });
  const data = await res.json();

  // Solo se muestran las keys de "Plan API" (monthlyLimit no-null) — la key interna que usa
  // la propia app de SimpleComm no se gestiona desde acá.
  const keys = (data.keys ?? []).filter((k: { monthlyLimit: number | null }) => k.monthlyLimit != null);
  return NextResponse.json({ keys, tenantReady: true });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = await resolveTenantId(user.id);
  if (!tenantId) {
    return NextResponse.json({
      error: 'Todavía no tenés tu certificado ARCA configurado. Completá eso primero para poder generar una API key.',
    }, { status: 400 });
  }

  const { name } = await req.json().catch(() => ({ name: undefined }));

  const res = await fetch(`${GATEWAY_URL}/v1/admin/tenants/${tenantId}/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_ADMIN_SECRET}` },
    body: JSON.stringify({
      name: (name && String(name).trim()) || `api-${Date.now()}`,
      monthly_limit: DEFAULT_API_KEY_MONTHLY_LIMIT,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error ?? 'No se pudo generar la API key' }, { status: 502 });

  return NextResponse.json({
    apiKey: data.api_key,
    prefix: data.api_key_prefix,
    monthlyLimit: DEFAULT_API_KEY_MONTHLY_LIMIT,
  }, { status: 201 });
}
