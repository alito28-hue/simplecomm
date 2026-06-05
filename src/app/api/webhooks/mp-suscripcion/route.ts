import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  let body: { type?: string; data?: { id?: string } };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  if (body.type !== 'payment') return NextResponse.json({ ok: true });

  const paymentId = body.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  // Obtener access token con client_credentials
  const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type:    'client_credentials',
    }),
  });
  const { access_token } = await tokenRes.json();

  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${access_token}` },
  });
  if (!payRes.ok) return NextResponse.json({ ok: true });

  const payment = await payRes.json();
  if (payment.status !== 'approved') return NextResponse.json({ ok: true });

  const externalRef = payment.external_reference ?? '';
  const [organizationId, planId] = externalRef.split(':');
  if (!organizationId || !planId) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const now      = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  await Promise.all([
    supabase.from('subscription_payments').insert({
      id:             randomUUID(),
      organizationId,
      planId,
      amount:         payment.transaction_amount,
      currency:       'ARS',
      status:         'approved',
      mpPaymentId:    String(paymentId),
      mpPayerEmail:   payment.payer?.email ?? null,
      periodStart:    now.toISOString(),
      periodEnd:      periodEnd.toISOString(),
      createdAt:      now.toISOString(),
    }),
    supabase.from('organizations').update({
      planId,
      subscriptionStatus: 'ACTIVE',
      updatedAt: now.toISOString(),
    }).eq('id', organizationId),
    supabase.from('notifications').insert({
      id:             randomUUID(),
      organizationId,
      type:           'success',
      title:          '¡Pago confirmado!',
      body:           `Tu suscripción al plan fue activada correctamente.`,
      actionUrl:      '/dashboard/cuenta',
      createdAt:      now.toISOString(),
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
