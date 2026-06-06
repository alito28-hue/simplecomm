import type { FastifyInstance } from 'fastify';
import { getPersona } from '../padron/client';
import { derivarCuils } from '../padron/cuil';
import { getValidTicket } from '../wsaa/cache';
import { endpoints } from '../config';
import { authenticateApiKey } from '../middleware/apikey';
import { db } from '../db/client';

export async function padronRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /v1/padron/:cuil
   * Consulta datos de una persona por CUIL/CUIT (ws_sr_padron_a5).
   */
  app.get<{ Params: { cuil: string } }>('/v1/padron/:cuil', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const clean = request.params.cuil.replace(/[-\s]/g, '');
    if (!/^\d{11}$/.test(clean)) {
      return reply.status(400).send({ error: 'CUIL inválido. Debe tener 11 dígitos.' });
    }

    try {
      const tenant = await db.tenant.findUnique({ where: { id: request.tenantId } });
      if (!tenant) return reply.status(404).send({ error: 'Tenant no encontrado' });

      const ticket = await getValidTicket(request.tenantId, 'ws_sr_padron_a5');
      const persona = await getPersona(endpoints.padron, ticket, tenant.cuit, clean);
      return reply.send(persona);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      request.log.error({ cuil: clean, afipError: message }, 'Error consultando Padrón AFIP (CUIL)');
      if (/no encontrado|inexistente|no registrado|no existe/i.test(message)) {
        return reply.status(404).send({ error: 'CUIL no encontrado en el Padrón AFIP' });
      }
      return reply.status(502).send({ error: message });
    }
  });

  /**
   * GET /v1/padron/por-dni/:dni
   * Deriva CUILs candidatos desde un DNI usando el algoritmo módulo 11,
   * luego valida cada uno contra ws_sr_padron_a5.
   * No requiere ws_sr_padron_a4 — solo usa a5 (ya autorizado).
   */
  app.get<{ Params: { dni: string } }>('/v1/padron/por-dni/:dni', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const clean = request.params.dni.replace(/\D/g, '');
    if (!/^\d{7,8}$/.test(clean)) {
      return reply.status(400).send({ error: 'DNI inválido. Debe tener 7 u 8 dígitos.' });
    }

    try {
      const tenant = await db.tenant.findUnique({ where: { id: request.tenantId } });
      if (!tenant) return reply.status(404).send({ error: 'Tenant no encontrado' });

      const candidates = derivarCuils(clean);
      const ticket = await getValidTicket(request.tenantId, 'ws_sr_padron_a5');

      const resultados = (
        await Promise.all(
          candidates.map(cuil =>
            getPersona(endpoints.padron, ticket, tenant.cuit, cuil).catch(() => null)
          )
        )
      ).filter(Boolean);

      if (resultados.length === 0) {
        return reply.status(404).send({ error: 'DNI no encontrado en el Padrón AFIP' });
      }

      return reply.send({ resultados });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      request.log.error({ dni: clean, afipError: message }, 'Error consultando Padrón AFIP (DNI)');
      return reply.status(502).send({ error: message });
    }
  });
}
