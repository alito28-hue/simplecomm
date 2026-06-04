import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ML_CLIENT_ID     = process.env.ML_CLIENT_ID ?? '';
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
const REDIRECT_URI = `${APP_URL}/api/integraciones/mercadolibre/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/mercadolibre?error=denied`);
  }

  // Intercambiar code por access_token
  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      code,
      redirect_uri:  REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/mercadolibre?error=token`);
  }

  const tokens = await tokenRes.json();

  // Guardar en Supabase
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  await supabase.from('integrations').upsert({
    id: `${user.id}_mercadolibre`,
    organizationId: user.id,
    platform: 'MERCADO_LIBRE',
    status: 'CONNECTED',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    config: { userId: tokens.user_id, expiresIn: tokens.expires_in },
    mode: 'AUTOMATIC',
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'id' });

  // Registrar webhook en ML
  await fetch('https://api.mercadolibre.com/applications/' + ML_CLIENT_ID + '/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: 'orders_v2',
      callback_url: `${APP_URL}/api/webhooks/mercadolibre`,
    }),
  }).catch(() => {}); // No fallar si el webhook ya existe

  return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/mercadolibre?success=1`);
}
