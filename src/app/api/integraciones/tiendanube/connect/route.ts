import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TN_CLIENT_ID = process.env.TN_CLIENT_ID ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
const REDIRECT_URI = `${APP_URL}/api/integraciones/tiendanube/callback`;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  if (!TN_CLIENT_ID) return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/tiendanube?error=not_configured`);

  const authUrl = new URL('https://www.tiendanube.com/apps/authorize/token');
  authUrl.searchParams.set('client_id', TN_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'read_orders write_orders');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', user.id);

  return NextResponse.redirect(authUrl.toString());
}
