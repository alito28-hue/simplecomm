import { db } from '../db/client';
import { loginCms, type AuthTicket } from './client';
import { endpoints, masterCredentials } from '../config';

// Margen de seguridad: renovar el TA 5 minutos antes de que venza
const RENEWAL_MARGIN_MS = 5 * 60 * 1000;

/**
 * Devuelve un TA válido para el tenant indicado.
 * Si hay uno en caché y no está por vencer, lo reutiliza.
 * Si no, llama a WSAA y guarda el nuevo TA.
 *
 * Para el MVP con un solo CUIT (Mocla SA), todos los tenants
 * usan el mismo certificado maestro.
 */
export async function getValidTicket(
  tenantId: string,
  service: string = 'wsfe'
): Promise<AuthTicket> {
  const now = new Date();
  const renewBefore = new Date(now.getTime() + RENEWAL_MARGIN_MS);

  // Buscar TA válido en base de datos
  const cached = await db.authTicket.findFirst({
    where: {
      tenantId,
      service,
      expiresAt: { gt: renewBefore },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return {
      token: cached.token,
      sign: cached.sign,
      expiresAt: cached.expiresAt,
      signer: cached.signer,
    };
  }

  // No hay TA válido — obtener uno nuevo de WSAA
  const ticket = await loginCms(endpoints.wsaa, masterCredentials, service);

  // Guardar en base de datos
  await db.authTicket.create({
    data: {
      tenantId,
      service,
      token: ticket.token,
      sign: ticket.sign,
      expiresAt: ticket.expiresAt,
      signer: ticket.signer,
    },
  });

  return ticket;
}

/**
 * Invalida el TA en caché (útil si WSFE devuelve error de autenticación).
 */
export async function invalidateTicket(tenantId: string, service: string = 'wsfe'): Promise<void> {
  await db.authTicket.deleteMany({ where: { tenantId, service } });
}
