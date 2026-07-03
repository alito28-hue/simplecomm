import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Passthrough al listado de provincias de Envíopack (para poblar el selector al cotizar/crear
// un envío). Shape de respuesta no confirmado contra la API real todavía — se devuelve tal
// cual viene, el frontend maneja defensivamente si no trae "id"/"nombre".
const BASE_URL = 'https://api.enviopack.com';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase.from('integrations')
    .select('config').eq('organizationId', user.id).eq('platform', 'ENVIOPACK').maybeSingle();
  const token = integration?.config?.accessToken;
  if (!token) return NextResponse.json({ error: 'Envíopack no está conectado' }, { status: 400 });

  const res = await fetch(`${BASE_URL}/provincias?access_token=${encodeURIComponent(token)}`, {
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!res?.ok) return NextResponse.json({ error: 'No se pudo obtener el listado de provincias' }, { status: 502 });
  return NextResponse.json(await res.json());
}
