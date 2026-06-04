import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SHOPIFY_CLIENT_ID     = process.env.SHOPIFY_CLIENT_ID ?? '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');

  if (!code || !shop) return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/shopify?error=denied`);

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, code }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/shopify?error=token`);

  const tokens = await tokenRes.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  await supabase.from('integrations').upsert({
    id: `${user.id}_shopify`,
    organizationId: user.id,
    platform: 'SHOPIFY',
    status: 'CONNECTED',
    accessToken: tokens.access_token,
    config: { shop },
    mode: 'AUTOMATIC',
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'id' });

  return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/shopify?success=1`);
}
