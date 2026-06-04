import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TN_CLIENT_ID     = process.env.TN_CLIENT_ID ?? '';
const TN_CLIENT_SECRET = process.env.TN_CLIENT_SECRET ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/tiendanube?error=denied`);

  const tokenRes = await fetch('https://www.tiendanube.com/apps/authorize/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: TN_CLIENT_ID,
      client_secret: TN_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/tiendanube?error=token`);

  const tokens = await tokenRes.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  await supabase.from('integrations').upsert({
    id: `${user.id}_tiendanube`,
    organizationId: user.id,
    platform: 'TIENDANUBE',
    status: 'CONNECTED',
    accessToken: tokens.access_token,
    config: { storeId: tokens.user_id },
    mode: 'AUTOMATIC',
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'id' });

  return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/tiendanube?success=1`);
}
