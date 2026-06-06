import type { FastifyInstance } from 'fastify';
import { getPersona } from '../padron/client';
import { getValidTicket } from '../wsaa/cache';
import { endpoints } from '../config';
import { authenticateApiKey } from '../middleware/apikey';
import { db } from '../db/client';

export async function padronRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /v1/padron/:cuil
   * Consulta datos de una persona en el Padrón AFIP (ws_sr_padron_a5).
   * Requiere que el CUIT del tenant esté habilitado para ws_sr_padron_a5 en AFIP.
   */
  app.get<{
    Params: { cuil: string };
  }>('/v1/padron/:cuil', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const { cuil } = request.params;

    const clean = cuil.replace(/[-\s]/g, '');
    if (!/^\d{11}$/.test(clean)) {
      return reply.status(400).send({ error: 'CUIL inválido. Debe tener 11 dígitos (con o sin guiones).' });
    }

    try {
      const tenant = await db.tenant.findUnique({ where: { id: request.tenantId } });
      if (!tenant) return reply.status(404).send({ error: 'Tenant no encontrado' });

      const ticket = await getValidTicket(request.tenantId, 'ws_sr_padron_a5');
      const persona = await getPersona(endpoints.padron, ticket, tenant.cuit, clean);

      return reply.send(persona);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.toLowerCase().includes('no encontrado') ||
        message.toLowerCase().includes('inexistente') ||
        message.toLowerCase().includes('no registrado') ||
        message.toLowerCase().includes('no existe')
      ) {
        return reply.status(404).send({ error: 'CUIL no encontrado en el Padrón AFIP' });
      }
      return reply.status(502).send({ error: message });
    }
  });
}
