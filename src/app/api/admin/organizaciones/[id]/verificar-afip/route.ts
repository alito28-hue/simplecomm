import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';
const GATEWAY_URL  = process.env.GATEWAY_URL ?? 'https://simplecomm-production.up.railway.app';
const FROM_EMAIL   = 'SimpleComm <info@simplecomm.com.ar>';

const resend = new Resend(process.env.RESEND_API_KEY);

async function notifyClientReady(orgId: string, orgName: string) {
  const db = createAdminClient();
  const { data } = await db.auth.admin.getUserById(orgId);
  const email = data?.user?.email;
  if (!email) return;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '¡Ya podés facturar desde SimpleComm!',
    html: `
      <p>Hola${orgName ? ` ${orgName}` : ''},</p>
      <p>Terminamos de habilitar tu cuenta en ARCA — ya está todo listo para que empieces a facturar desde SimpleComm.</p>
      <p><a href="https://simplecomm.com.ar/dashboard/facturacion/simplificada">Emitir tu primera factura →</a></p>
      <p>Cualquier duda, respondé este mail.</p>
    `,
  }).catch(err => console.error('[Resend] Failed to notify client ready:', err));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: org } = await db.from('organizations').select('name, gatewayApiKey, afipRelationVerifiedAt').eq('id', id).single();
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

  const eraPrimeraVerificacion = !org.afipRelationVerifiedAt;

  await db.from('organizations').update({ afipRelationVerifiedAt: new Date().toISOString() }).eq('id', id);

  // Avisar al cliente solo la primera vez que se confirma — no en cada re-verificación.
  if (eraPrimeraVerificacion) {
    await notifyClientReady(id, org.name ?? '');
  }

  return NextResponse.json({ ok: true, puntosVenta: data.puntosVenta, asignado: data.asignado });
}
