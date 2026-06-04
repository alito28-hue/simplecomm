import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
const REDIRECT_URI = `${APP_URL}/api/integraciones/shopify/callback`;
const SCOPES = 'read_orders,write_orders,read_customers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop');

  if (!shop || !SHOPIFY_CLIENT_ID) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/shopify?error=missing_shop`);
  }

  const nonce = Math.random().toString(36).substring(2);
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${nonce}`;

  return NextResponse.redirect(authUrl);
}
