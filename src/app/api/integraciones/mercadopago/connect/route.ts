import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MP_CLIENT_ID = process.env.MP_CLIENT_ID ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
const REDIRECT_URI = `${APP_URL}/api/integraciones/mercadopago/callback`;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  if (!MP_CLIENT_ID) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/mercadopago?error=not_configured`);
  }

  const authUrl = new URL('https://auth.mercadopago.com.ar/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', MP_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', user.id);

  return NextResponse.redirect(authUrl.toString());
}
