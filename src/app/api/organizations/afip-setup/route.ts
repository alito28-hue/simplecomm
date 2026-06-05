import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GATEWAY_URL          = process.env.GATEWAY_URL          ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_ADMIN_SECRET = process.env.GATEWAY_ADMIN_SECRET ?? '';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  let body: {
    cuit: string;
    ptoVta: number;
    authMethod: 'delegation' | 'certificate';
    certPem?: string;
    keyPem?: string;
    chainPem?: string;
  };

  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }); }

  if (!body.cuit || !body.ptoVta) {
    return NextResponse.json({ error: 'CUIT y punto de venta son requeridos' }, { status: 400 });
  }

  const cleanCuit = body.cuit.replace(/\D/g, '');
  if (cleanCuit.length !== 11) {
    return NextResponse.json({ error: 'CUIT inválido (debe tener 11 dígitos)' }, { status: 400 });
  }

  if (body.authMethod === 'certificate' && (!body.certPem || !body.keyPem || !body.chainPem)) {
    return NextResponse.json({ error: 'Certificado, clave y cadena CA son requeridos para método certificado' }, { status: 400 });
  }

  if (!GATEWAY_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Gateway admin no configurado' }, { status: 503 });
  }

  // Obtener datos de la organización para el nombre
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, cuit')
    .eq('userId', user.id)
    .maybeSingle();

  if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });

  // Registrar tenant en el Gateway
  const gatewayPayload: Record<string, unknown> = {
    code:    `org_${org.id.replace(/-/g, '').slice(0, 12)}`,
    name:    org.name ?? `Cliente ${cleanCuit}`,
    cuit:    cleanCuit,
    pto_vta: body.ptoVta,
    environment: 'production',
  };

  if (body.authMethod === 'certificate') {
    gatewayPayload.cert_pem  = body.certPem;
    gatewayPayload.key_pem   = body.keyPem;
    gatewayPayload.chain_pem = body.chainPem;
  }

  const gwRes = await fetch(`${GATEWAY_URL}/v1/admin/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_ADMIN_SECRET}`,
    },
    body: JSON.stringify(gatewayPayload),
    signal: AbortSignal.timeout(30_000),
  });

  const gwData = await gwRes.json();

  // Si ya existe el tenant (CUIT duplicado), usar el ID existente
  if (gwRes.status === 409 && gwData.tenant_id) {
    await supabase.from('organizations').update({
      gatewayTenantId: gwData.tenant_id,
      ptoVta: body.ptoVta,
      afipConfigured: true,
    }).eq('id', org.id);

    return NextResponse.json({ ok: true, message: 'Tenant ya existente vinculado', tenant_id: gwData.tenant_id });
  }

  if (!gwRes.ok) {
    return NextResponse.json({ error: gwData.error ?? 'Error al registrar en Gateway' }, { status: 502 });
  }

  // Guardar el API key del Gateway en la organización
  await supabase.from('organizations').update({
    gatewayTenantId: gwData.tenant_id,
    gatewayApiKey:   gwData.api_key,
    ptoVta:          body.ptoVta,
    afipConfigured:  true,
  }).eq('id', org.id);

  return NextResponse.json({
    ok: true,
    tenant_id:   gwData.tenant_id,
    auth_method: gwData.auth_method,
    pto_vta:     body.ptoVta,
  });
}
