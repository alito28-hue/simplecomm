import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BASE_URL = 'https://api.enviopack.com';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { apiKey, secretKey, direccionEnvioId } = await req.json();
  if (!apiKey || !secretKey) {
    return NextResponse.json({ error: 'Faltan api-key y secret-key' }, { status: 400 });
  }

  // Probar las credenciales antes de guardar.
  let tokenData: { access_token: string; refresh_token: string };
  try {
    const res = await fetch(`${BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'api-key': apiKey, 'secret-key': secretKey }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: `Envíopack rechazó las credenciales (${res.status}): ${text}` }, { status: 400 });
    }
    tokenData = await res.json();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo conectar con Envíopack' }, { status: 502 });
  }

  const config = {
    apiKey,
    secretKey,
    direccionEnvioId: direccionEnvioId || undefined,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenExpiresAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
  };

  await supabase.from('integrations').upsert({
    id: `${user.id}_enviopack`,
    organizationId: user.id,
    platform: 'ENVIOPACK',
    status: 'CONNECTED',
    mode: 'AUTOMATIC',
    config,
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'id' });

  return NextResponse.json({ success: true });
}
