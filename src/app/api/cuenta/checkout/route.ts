import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLANS, type PlanId } from '@/lib/usage';

const PLAN_PRICES: Record<PlanId, number> = {
  plan_starter:    4990,
  plan_pro:        9990,
  plan_enterprise: 24990,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';

async function getMpAccessToken(): Promise<string> {
  const res = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type:    'client_credentials',
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId } = await req.json();
  if (!planId || !(planId in PLANS)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  const plan  = PLANS[planId as PlanId];
  const price = PLAN_PRICES[planId as PlanId];

  const accessToken = await getMpAccessToken();

  const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [{
        title:       `SimpleComm ${plan.label} — ${plan.monthlyLimit} comprobantes/mes`,
        quantity:    1,
        unit_price:  price,
        currency_id: 'ARS',
      }],
      back_urls: {
        success: `${APP_URL}/dashboard/cuenta?pago=ok`,
        failure: `${APP_URL}/dashboard/cuenta?pago=error`,
        pending: `${APP_URL}/dashboard/cuenta?pago=pendiente`,
      },
      auto_return: 'approved',
      external_reference: `${user.id}:${planId}`,
      notification_url: `${APP_URL}/api/webhooks/mp-suscripcion`,
      metadata: { organizationId: user.id, planId },
    }),
  });

  if (!prefRes.ok) {
    const err = await prefRes.json();
    return NextResponse.json({ error: err.message ?? 'Error MP' }, { status: 502 });
  }

  const pref = await prefRes.json();
  return NextResponse.json({ checkoutUrl: pref.init_point });
}
