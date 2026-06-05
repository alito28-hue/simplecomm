import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TN_CLIENT_ID     = process.env.TN_CLIENT_ID ?? '';
const TN_CLIENT_SECRET = process.env.TN_CLIENT_SECRET ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
const USER_AGENT = 'SimpleComm (alito28@gmail.com)';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/tiendanube?error=denied`);
  }

  const tokenRes = await fetch('https://www.tiendanube.com/apps/authorize/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     TN_CLIENT_ID,
      client_secret: TN_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/tiendanube?error=token`);
  }

  const tokens = await tokenRes.json();
  // tokens.user_id = store ID de Tiendanube
  const storeId = tokens.user_id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  await supabase.from('integrations').upsert({
    id: `${user.id}_tiendanube`,
    organizationId: user.id,
    platform: 'TIENDANUBE',
    status: 'CONNECTED',
    accessToken: tokens.access_token,
    config: { storeId },
    mode: 'AUTOMATIC',
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'id' });

  // Registrar webhook en Tiendanube para pedidos pagados
  await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks`, {
    method: 'POST',
    headers: {
      'Authentication': `bearer ${tokens.access_token}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: 'order/paid',
      url: `${APP_URL}/api/webhooks/tiendanube`,
    }),
  }).catch(() => {}); // No fallar si el webhook ya existe

  return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/tiendanube?success=1`);
}
