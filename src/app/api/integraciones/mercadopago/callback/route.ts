import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MP_CLIENT_ID     = process.env.MP_CLIENT_ID ?? '';
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
const REDIRECT_URI = `${APP_URL}/api/integraciones/mercadopago/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');

  if (!code) return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/mercadopago?error=denied`);

  const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/mercadopago?error=token`);

  const tokens = await tokenRes.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  await supabase.from('integrations').upsert({
    id: `${user.id}_mercadopago`,
    organizationId: user.id,
    platform: 'MERCADO_PAGO',
    status: 'CONNECTED',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    config: { userId: tokens.user_id },
    mode: 'AUTOMATIC',
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'id' });

  return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/mercadopago?success=1`);
}
