import { db } from '../db/client';
import { loginCms, type AuthTicket } from './client';
import { endpoints, masterCredentials } from '../config';
import { decrypt } from '../crypto/encrypt';

const RENEWAL_MARGIN_MS = 5 * 60 * 1000;

let masterTenantIdCache: string | null = null;

/**
 * AFIP permite un único TA (ticket de acceso) válido por certificado y servicio a la vez.
 * El certificado maestro (Mocla SA) es UNO SOLO y lo comparten todos los tenants por
 * delegación — si cada uno pidiera su propio ticket bajo su propio tenantId, AFIP rechazaría
 * a todos menos al primero con "el CEE ya posee un TA válido...". Por eso el ticket se cachea
 * bajo el tenant de Mocla (dueño real del certificado), compartido entre todos los delegados.
 * El CUIT de cada cliente se manda aparte, en el campo Auth.Cuit de cada llamado a WSFE — el
 * ticket compartido solo prueba "quién firma", no "para quién se factura".
 */
async function getMasterTenantId(): Promise<string> {
  if (masterTenantIdCache) return masterTenantIdCache;
  const master = await db.tenant.findFirst({ where: { cuit: masterCredentials.cuit } });
  if (!master) {
    throw new Error(
      `No existe un Tenant con CUIT ${masterCredentials.cuit} (certificado maestro) — no se puede cachear el ticket compartido de delegación.`
    );
  }
  masterTenantIdCache = master.id;
  return master.id;
}

interface ResolvedCredentials {
  certPem: string;
  keyPem: string;
  chainPem: string;
  /** Tenant bajo el cual se cachea el TA — el propio tenant si tiene cert propio, o el de Mocla si usa delegación. */
  cacheKey: string;
}

async function resolveCredentials(tenantId: string): Promise<ResolvedCredentials> {
  const stored = await db.tenantCredential.findUnique({
    where: { tenantId, active: true },
  });

  if (stored) {
    console.log(`[wsaa] tenant ${tenantId} usando credencial propia (fingerprint: ${stored.fingerprint})`);
    return {
      certPem: decrypt(stored.certEnc),
      keyPem: decrypt(stored.keyEnc),
      chainPem: decrypt(stored.chainEnc),
      cacheKey: tenantId,
    };
  }

  const masterTenantId = await getMasterTenantId();
  console.log(`[wsaa] tenant ${tenantId} usando credencial maestra (Mocla SA / delegación) — ticket compartido bajo tenant ${masterTenantId}`);
  return {
    certPem: masterCredentials.certPem,
    keyPem: masterCredentials.keyPem,
    chainPem: masterCredentials.chainPem,
    cacheKey: masterTenantId,
  };
}

/**
 * Devuelve un TA válido para el tenant indicado (propio o compartido por delegación, ver
 * resolveCredentials). Cada tenant con certificado propio tiene su ticket independiente;
 * los tenants por delegación comparten uno solo.
 */
export async function getValidTicket(
  tenantId: string,
  service: string = 'wsfe'
): Promise<AuthTicket> {
  const { certPem, keyPem, chainPem, cacheKey } = await resolveCredentials(tenantId);

  const now = new Date();
  const renewBefore = new Date(now.getTime() + RENEWAL_MARGIN_MS);

  const cached = await db.authTicket.findFirst({
    where: { tenantId: cacheKey, service, expiresAt: { gt: renewBefore } },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return { token: cached.token, sign: cached.sign, expiresAt: cached.expiresAt, signer: cached.signer };
  }

  try {
    const ticket = await loginCms(endpoints.wsaa, { certPem, keyPem, chainPem }, service);
    await db.authTicket.create({
      data: { tenantId: cacheKey, service, token: ticket.token, sign: ticket.sign, expiresAt: ticket.expiresAt, signer: ticket.signer },
    });
    return ticket;
  } catch (err) {
    // Condición de carrera: dos tenants por delegación pidieron el ticket compartido casi al
    // mismo tiempo y AFIP ya le entregó el TA al otro request. Releemos por si ya quedó cacheado.
    const retry = await db.authTicket.findFirst({
      where: { tenantId: cacheKey, service, expiresAt: { gt: renewBefore } },
      orderBy: { createdAt: 'desc' },
    });
    if (retry) return { token: retry.token, sign: retry.sign, expiresAt: retry.expiresAt, signer: retry.signer };
    throw err;
  }
}

export async function invalidateTicket(tenantId: string, service: string = 'wsfe'): Promise<void> {
  const { cacheKey } = await resolveCredentials(tenantId);
  await db.authTicket.deleteMany({ where: { tenantId: cacheKey, service } });
}

/**
 * CUIT del dueño real del certificado que se va a usar para este tenant (el propio tenant si
 * tiene certificado propio, o Mocla si usa delegación) — distinto del CUIT del tenant en sí.
 * Necesario para webservices como Consulta de Padrón, donde el parámetro "cuitRepresentada"
 * tiene que ser quien realmente posee el certificado/token, no el CUIT que se está facturando
 * (a diferencia de WSFE, la consulta de Padrón de un tercero no depende de que ese tercero
 * haya delegado nada — solo depende de que el dueño del certificado tenga el servicio propio).
 */
export async function getCredentialOwnerCuit(tenantId: string): Promise<string> {
  const { cacheKey } = await resolveCredentials(tenantId);
  const owner = await db.tenant.findUnique({ where: { id: cacheKey } });
  if (!owner) throw new Error(`No se encontró el tenant dueño del certificado (id: ${cacheKey})`);
  return owner.cuit;
}
