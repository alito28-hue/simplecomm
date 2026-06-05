import { createClient } from '@/lib/supabase/server';

const GATEWAY_URL     = process.env.GATEWAY_URL     ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? ''; // Mocla SA fallback

/**
 * Devuelve el API key del Gateway para una organización.
 * Si la org tiene su propio key (configuró ARCA), lo usa.
 * Si no, cae al key global de Mocla SA (solo válido para ClubSorteos).
 */
export async function getGatewayKey(organizationId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('organizations')
    .select('gatewayApiKey')
    .eq('id', organizationId)
    .maybeSingle();

  return data?.gatewayApiKey ?? GATEWAY_API_KEY;
}

export { GATEWAY_URL };
