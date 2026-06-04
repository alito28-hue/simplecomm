import type { FastifyInstance } from 'fastify';
import { loginCms } from '../wsaa/client';
import { endpoints, masterCredentials, config } from '../config';
import { authenticateApiKey } from '../middleware/apikey';
import { db } from '../db/client';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/auth/status
   * Smoke test: obtiene un TA real de WSAA producción.
   * Respuesta exitosa confirma que el certificado y la firma CMS funcionan.
   */
  app.post('/v1/auth/status', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const start = Date.now();

    try {
      const ticket = await loginCms(
        endpoints.wsaa,
        masterCredentials,
        'wsfe'
      );

      const durationMs = Date.now() - start;

      // Guardar/actualizar en caché
      await db.authTicket.create({
        data: {
          tenantId: request.tenantId,
          service: 'wsfe',
          token: ticket.token,
          sign: ticket.sign,
          expiresAt: ticket.expiresAt,
          signer: ticket.signer,
        },
      }).catch(() => {}); // No fallar si ya existe uno idéntico

      return reply.send({
        ok: true,
        environment: config.AFIP_ENV,
        signer: ticket.signer,
        expiresAt: ticket.expiresAt.toISOString(),
        wsaaUrl: endpoints.wsaa,
        tenantCuit: masterCredentials.cuit,
        durationMs,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - start;

      app.log.error({ err, tenantId: request.tenantId }, 'auth/status falló');

      return reply.status(502).send({
        ok: false,
        error: message,
        environment: config.AFIP_ENV,
        wsaaUrl: endpoints.wsaa,
        durationMs,
      });
    }
  });

  /**
   * GET /v1/auth/status
   * Devuelve el último TA en caché sin llamar a WSAA.
   */
  app.get('/v1/auth/status', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const cached = await db.authTicket.findFirst({
      where: { tenantId: request.tenantId, service: 'wsfe' },
      orderBy: { createdAt: 'desc' },
    });

    if (!cached) {
      return reply.send({
        ok: false,
        cached: false,
        message: 'No hay TA en caché. Llamar POST /v1/auth/status para obtener uno.',
      });
    }

    const isValid = cached.expiresAt > new Date();

    return reply.send({
      ok: isValid,
      cached: true,
      valid: isValid,
      signer: cached.signer,
      expiresAt: cached.expiresAt.toISOString(),
      createdAt: cached.createdAt.toISOString(),
    });
  });
}
