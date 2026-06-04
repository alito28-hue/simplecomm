import type { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
    tenantCuit: string;
  }
}

/**
 * Middleware que valida la API key del header Authorization.
 * Formato: Bearer sc_live_XXXXXXXXXXX
 *
 * Adjunta tenantId y tenantCuit al request para los handlers.
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'API key requerida. Formato: Bearer <key>' });
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return reply.status(401).send({ error: 'API key vacía' });
  }

  // Buscar por prefijo (primeros 8 chars) para no tener que iterar todos los hashes
  const prefix = rawKey.slice(0, 8);

  const apiKeys = await db.apiKey.findMany({
    where: { prefix, active: true },
    include: { tenant: true },
  });

  for (const apiKey of apiKeys) {
    const valid = await bcrypt.compare(rawKey, apiKey.keyHash);
    if (valid && apiKey.tenant.status === 'ACTIVE') {
      request.tenantId = apiKey.tenant.id;
      request.tenantCuit = apiKey.tenant.cuit;
      return;
    }
  }

  return reply.status(401).send({ error: 'API key inválida o inactiva' });
}
