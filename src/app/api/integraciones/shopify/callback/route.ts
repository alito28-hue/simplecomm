import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SHOPIFY_CLIENT_ID     = process.env.SHOPIFY_CLIENT_ID ?? '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
const SHOPIFY_API_VERSION = '2024-01';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const shop  = searchParams.get('shop');
  const state = searchParams.get('state') ?? '';

  if (!code || !shop) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/shopify?error=denied`);
  }

  // El userId viene en la primera parte del state
  const userId = state.split(':')[0];

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, code }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/shopify?error=token`);
  }

  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const resolvedUserId = user?.id ?? userId;
  if (!resolvedUserId) return NextResponse.redirect(`${APP_URL}/login`);

  await supabase.from('integrations').upsert({
    id: `${resolvedUserId}_shopify_${shop.replace(/\./g, '_')}`,
    organizationId: resolvedUserId,
    platform: 'SHOPIFY',
    status: 'CONNECTED',
    accessToken,
    config: { shop },
    mode: 'AUTOMATIC',
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'id' });

  // Registrar webhook para pedidos pagados
  await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhook: {
        topic: 'orders/paid',
        address: `${APP_URL}/api/webhooks/shopify`,
        format: 'json',
      },
    }),
  }).catch(() => {}); // No fallar si el webhook ya existe

  return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/shopify?success=1&shop=${encodeURIComponent(shop)}`);
}
