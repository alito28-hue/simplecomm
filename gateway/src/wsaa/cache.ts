import { db } from '../db/client';
import { loginCms, type AuthTicket } from './client';
import { endpoints, masterCredentials } from '../config';
import { decrypt } from '../crypto/encrypt';

const RENEWAL_MARGIN_MS = 5 * 60 * 1000;

/**
 * Devuelve las credenciales AFIP para un tenant.
 * Si el tenant tiene sus propias credenciales en DB (cert subido), las usa.
 * Si no, usa las credenciales maestras de Mocla SA (para delegación o Mocla SA mismo).
 */
async function getCredentialsForTenant(tenantId: string) {
  const stored = await db.tenantCredential.findUnique({
    where: { tenantId, active: true },
  });

  if (stored) {
    console.log(`[wsaa] tenant ${tenantId} usando credencial propia (fingerprint: ${stored.fingerprint})`);
    return {
      certPem:  decrypt(stored.certEnc),
      keyPem:   decrypt(stored.keyEnc),
      chainPem: decrypt(stored.chainEnc),
    };
  }

  // Fallback: Mocla SA / delegación
  console.log(`[wsaa] tenant ${tenantId} usando credencial maestra (Mocla SA / delegación)`);
  return {
    certPem:  masterCredentials.certPem,
    keyPem:   masterCredentials.keyPem,
    chainPem: masterCredentials.chainPem,
  };
}

/**
 * Devuelve un TA válido para el tenant indicado.
 * Cada tenant puede tener su propio certificado (credenciales en DB)
 * o usar el certificado maestro de Mocla SA (delegación).
 */
export async function getValidTicket(
  tenantId: string,
  service: string = 'wsfe'
): Promise<AuthTicket> {
  const now = new Date();
  const renewBefore = new Date(now.getTime() + RENEWAL_MARGIN_MS);

  const cached = await db.authTicket.findFirst({
    where: { tenantId, service, expiresAt: { gt: renewBefore } },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return { token: cached.token, sign: cached.sign, expiresAt: cached.expiresAt, signer: cached.signer };
  }

  const credentials = await getCredentialsForTenant(tenantId);
  const ticket = await loginCms(endpoints.wsaa, credentials, service);

  await db.authTicket.create({
    data: { tenantId, service, token: ticket.token, sign: ticket.sign, expiresAt: ticket.expiresAt, signer: ticket.signer },
  });

  return ticket;
}

export async function invalidateTicket(tenantId: string, service: string = 'wsfe'): Promise<void> {
  await db.authTicket.deleteMany({ where: { tenantId, service } });
}
