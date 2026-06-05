import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TN_CLIENT_ID = process.env.TN_CLIENT_ID ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  if (!TN_CLIENT_ID) {
    return NextResponse.redirect(`${APP_URL}/dashboard/integraciones/tiendanube?error=not_configured`);
  }

  // URL de autorización de Tiendanube: /apps/{client_id}/authorize
  const authUrl = new URL(`https://www.tiendanube.com/apps/${TN_CLIENT_ID}/authorize`);
  authUrl.searchParams.set('state', user.id);

  return NextResponse.redirect(authUrl.toString());
}
