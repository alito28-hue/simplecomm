import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';
const GATEWAY_URL  = process.env.GATEWAY_URL ?? 'https://simplecomm-production.up.railway.app';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: org } = await db.from('organizations').select('gatewayApiKey').eq('id', id).single();
  if (!org?.gatewayApiKey) {
    return NextResponse.json({ error: 'Esta organización no tiene ARCA configurado todavía' }, { status: 400 });
  }

  const res = await fetch(`${GATEWAY_URL}/v1/wsfe/puntos-venta`, {
    headers: { 'Authorization': `Bearer ${org.gatewayApiKey}` },
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: data.error ?? 'ARCA rechazó la consulta' }, { status: 200 });
  }

  await db.from('organizations').update({ afipRelationVerifiedAt: new Date().toISOString() }).eq('id', id);

  return NextResponse.json({ ok: true, puntosVenta: data.puntosVenta, asignado: data.asignado });
}
