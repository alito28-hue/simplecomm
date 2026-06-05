import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ML_CLIENT_ID = process.env.ML_CLIENT_ID ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
const REDIRECT_URI = `${APP_URL}/api/integraciones/mercadolibre/callback`;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  if (!ML_CLIENT_ID) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/integraciones/mercadolibre?error=not_configured`
    );
  }

  const authUrl = new URL('https://auth.mercadolibre.com.ar/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', ML_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', user.id);

  return NextResponse.redirect(authUrl.toString());
}
