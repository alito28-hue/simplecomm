import { createClient } from '@/lib/supabase/server';

/**
 * Cliente para la API de Envíopack (https://developers.enviopack.com.ar/).
 *
 * ⚠️ Escrito 100% contra la documentación pública — todavía no probado contra la API real
 * porque la cuenta está pendiente de aprobación. Verificar el primer llamado real (auth y
 * una cotización) apenas lleguen las credenciales, antes de confiar en esto en producción.
 *
 * Autenticación: POST /auth con api-key + secret-key → access_token (dura 4hs) + refresh_token.
 * El token se pasa como query param en cada request, no como header.
 */

const BASE_URL = 'https://api.enviopack.com';

interface EnviopackConfig {
  apiKey?: string;
  secretKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string; // ISO
  direccionEnvioId?: string; // id de la dirección de despacho configurada en el panel de Envíopack
}

async function getIntegration(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string) {
  const { data } = await supabase.from('integrations')
    .select('id, status, config')
    .eq('organizationId', organizationId)
    .eq('platform', 'ENVIOPACK')
    .maybeSingle();
  return data;
}

async function requestToken(apiKey: string, secretKey: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'api-key': apiKey, 'secret-key': secretKey }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Envíopack auth falló (${res.status}): ${await res.text().catch(() => '')}`);
  return res.json();
}

async function refreshToken(refresh_token: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${BASE_URL}/token/refresh?refresh_token=${encodeURIComponent(refresh_token)}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Envíopack refresh de token falló (${res.status})`);
  return res.json();
}

/** Devuelve un access_token vigente, renovándolo si venció (dura 4hs) o pidiendo uno nuevo si no había. */
async function ensureAccessToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
): Promise<{ token: string; config: EnviopackConfig }> {
  const integration = await getIntegration(supabase, organizationId);
  if (!integration || integration.status !== 'CONNECTED') {
    throw new Error('Envíopack no está conectado. Configuralo en Integraciones → Envíopack.');
  }
  const config = (integration.config ?? {}) as EnviopackConfig;

  const expiresAt = config.tokenExpiresAt ? new Date(config.tokenExpiresAt) : null;
  const stillValid = config.accessToken && expiresAt && expiresAt.getTime() - Date.now() > 5 * 60_000; // margen de 5 min

  if (stillValid) {
    return { token: config.accessToken!, config };
  }

  let tokenData: { access_token: string; refresh_token: string };
  try {
    if (config.refreshToken) {
      tokenData = await refreshToken(config.refreshToken);
    } else if (config.apiKey && config.secretKey) {
      tokenData = await requestToken(config.apiKey, config.secretKey);
    } else {
      throw new Error('Faltan credenciales de Envíopack (api-key/secret-key).');
    }
  } catch (err) {
    // Si el refresh falla (ej. refresh_token también venció), reintentar con api-key/secret-key.
    if (config.apiKey && config.secretKey) {
      tokenData = await requestToken(config.apiKey, config.secretKey);
    } else {
      throw err;
    }
  }

  const newConfig: EnviopackConfig = {
    ...config,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenExpiresAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
  };
  await supabase.from('integrations').update({ config: newConfig }).eq('id', integration.id);

  return { token: tokenData.access_token, config: newConfig };
}

export interface Paquete {
  altoCm: number;
  anchoCm: number;
  profundidadCm: number;
  pesoKg: number;
}

function paquetesParam(paquetes: Paquete[]): string {
  // Formato documentado: "altoxanchoxlargo,altoxanchoxlargo" en cm — el peso se envía aparte.
  return paquetes.map(p => `${p.altoCm}x${p.anchoCm}x${p.profundidadCm}`).join(',');
}

export interface CotizacionResult {
  correo: string;
  valor: number;
  horasEntrega: number | null;
  servicio: string;
  modalidad: 'D' | 'S';
}

export interface CotizarParams {
  provinciaId: string;
  codigoPostal: string;
  localidadId?: string;
  paquetes: Paquete[];
}

/** Cotiza envío a domicilio y a sucursal para un destino, sumando el peso total de los paquetes. */
export async function cotizarEnvio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  params: CotizarParams,
): Promise<{ aDomicilio: CotizacionResult[]; aSucursal: CotizacionResult[] }> {
  const { token } = await ensureAccessToken(supabase, organizationId);
  const pesoTotal = params.paquetes.reduce((s, p) => s + p.pesoKg, 0);
  const paquetesStr = paquetesParam(params.paquetes);

  async function fetchCotizacion(path: string, extraParams: Record<string, string>) {
    const qs = new URLSearchParams({
      access_token: token,
      provincia: params.provinciaId,
      peso: String(pesoTotal),
      paquetes: paquetesStr,
      ...extraParams,
    });
    const res = await fetch(`${BASE_URL}${path}?${qs}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.resultados ?? []);
  }

  const [domicilioRaw, sucursalRaw] = await Promise.all([
    fetchCotizacion('/cotizar/precio/a-domicilio', { codigo_postal: params.codigoPostal }),
    params.localidadId
      ? fetchCotizacion('/cotizar/precio/a-sucursal', { localidad: params.localidadId })
      : Promise.resolve([]),
  ]);

  function normalize(raw: Record<string, unknown>[], modalidad: 'D' | 'S'): CotizacionResult[] {
    return raw.map(r => ({
      correo: String((r.correo as Record<string, unknown>)?.nombre ?? (r.sucursal as Record<string, unknown>)?.correo ?? 'Correo'),
      valor: Number(r.valor ?? 0),
      horasEntrega: r.horas_entrega != null ? Number(r.horas_entrega) : null,
      servicio: String(r.servicio ?? 'N'),
      modalidad,
    }));
  }

  return { aDomicilio: normalize(domicilioRaw, 'D'), aSucursal: normalize(sucursalRaw, 'S') };
}

export interface DestinatarioParams {
  nombre: string;
  calle: string;
  numero: string;
  piso?: string;
  codigoPostal: string;
  provinciaId: string;
  localidadId: string;
}

export interface CrearEnvioParams {
  destinatario: DestinatarioParams;
  paquetes: Paquete[];
  servicio: 'N' | 'P' | 'X' | 'R';
  correoId: string;
  modalidad: 'D' | 'S';
  pedidoRef?: string;
}

export interface EnvioCreado {
  envioId: string;
  trackingNumber: string | null;
  estado: string;
  costoEnvio: number;
}

/** Crea el envío en Envíopack. Requiere que la organización tenga configurado direccionEnvioId. */
export async function crearEnvio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  params: CrearEnvioParams,
): Promise<EnvioCreado> {
  const { token, config } = await ensureAccessToken(supabase, organizationId);
  if (!config.direccionEnvioId) {
    throw new Error('Falta configurar la dirección de despacho (direccionEnvioId) en Integraciones → Envíopack.');
  }

  const res = await fetch(`${BASE_URL}/envios?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      direccion_envio: config.direccionEnvioId,
      despacho: params.modalidad,
      modalidad: params.modalidad,
      servicio: params.servicio,
      correo: params.correoId,
      confirmado: true,
      destinatario: params.destinatario.nombre,
      calle: params.destinatario.calle,
      numero: params.destinatario.numero,
      piso: params.destinatario.piso,
      codigo_postal: params.destinatario.codigoPostal,
      provincia: params.destinatario.provinciaId,
      localidad: params.destinatario.localidadId,
      paquetes: params.paquetes.map(p => ({
        alto: p.altoCm, ancho: p.anchoCm, largo: p.profundidadCm, peso: p.pesoKg,
      })),
      pedido: params.pedidoRef,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Envíopack: no se pudo crear el envío (${res.status}): ${await res.text().catch(() => '')}`);
  const data = await res.json();
  return {
    envioId: String(data.id),
    trackingNumber: data.tracking_number ?? null,
    estado: data.estado ?? 'PENDIENTE',
    costoEnvio: Number(data.costo_envio ?? data.costo ?? 0),
  };
}

/** URL firmada del PDF de etiqueta para un envío ya creado. */
export async function obtenerEtiquetaUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  envioId: string,
): Promise<string> {
  const { token } = await ensureAccessToken(supabase, organizationId);
  return `${BASE_URL}/envios/${encodeURIComponent(envioId)}/etiqueta?access_token=${encodeURIComponent(token)}&formato=pdf`;
}
