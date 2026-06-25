import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GATEWAY_URL          = process.env.GATEWAY_URL          ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_ADMIN_SECRET = process.env.GATEWAY_ADMIN_SECRET ?? '';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Buscar por id (que usamos como organizationId = user.id)
  const { data } = await supabase.from('organizations')
    .select('*').eq('id', user.id).maybeSingle();

  return NextResponse.json(data ?? null);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (typeof body.cuit === 'string') body.cuit = body.cuit.replace(/\D/g, '');
  const now = new Date().toISOString();

  // Verificar si ya existe
  const { data: existing } = await supabase.from('organizations')
    .select('id').eq('id', user.id).maybeSingle();

  let result;
  if (existing) {
    result = await supabase.from('organizations')
      .update({ ...body, updatedAt: now })
      .eq('id', user.id).select().single();
  } else {
    result = await supabase.from('organizations')
      .insert({ ...body, id: user.id, createdAt: now, updatedAt: now })
      .select().single();
  }

  if (result.error) {
    if (result.error.code === '23505' && result.error.message.includes('cuit')) {
      return NextResponse.json(
        { error: 'Ese CUIT/CUIL ya está registrado en otra cuenta. Si es un error, contactanos para resolverlo.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // Si ya tiene un tenant en el Gateway, sincronizar los datos fiscales para que
  // las próximas facturas salgan con el domicilio/IIBB/fecha de inicio al día.
  if (result.data?.gatewayTenantId && GATEWAY_ADMIN_SECRET) {
    await fetch(`${GATEWAY_URL}/v1/admin/tenants/${result.data.gatewayTenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GATEWAY_ADMIN_SECRET}` },
      body: JSON.stringify({
        name: result.data.name,
        address: result.data.address ?? undefined,
        iibb: result.data.iibb ?? undefined,
        activity_start_date: result.data.startDate ?? undefined,
      }),
      signal: AbortSignal.timeout(30_000),
    }).catch(() => {});
  }

  return NextResponse.json(result.data);
}
