import type { FastifyInstance } from 'fastify';
import { getPersona } from '../padron/client';
import { getPersonaListByDocumento } from '../padron/clientA4';
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
      if (/no encontrado|inexistente|no registrado|no existe/i.test(message)) {
        return reply.status(404).send({ error: 'CUIL no encontrado en el Padrón AFIP' });
      }
      return reply.status(502).send({ error: message });
    }
  });

  /**
   * GET /v1/padron/por-dni/:dni
   * Busca CUILs a partir de un DNI (ws_sr_padron_a4) y enriquece con datos de a5.
   * Devuelve 0, 1 o 2 resultados (masculino/femenino).
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

      // Paso 1: derivar CUILs desde el DNI via a4
      const ticketA4 = await getValidTicket(request.tenantId, 'ws_sr_padron_a4');
      const cuils = await getPersonaListByDocumento(endpoints.padronA4, ticketA4, tenant.cuit, clean);

      if (cuils.length === 0) {
        return reply.status(404).send({ error: 'DNI no encontrado en el Padrón AFIP' });
      }

      // Paso 2: enriquecer con datos completos via a5
      const ticketA5 = await getValidTicket(request.tenantId, 'ws_sr_padron_a5');
      const resultados = (
        await Promise.all(
          cuils.map(cuil =>
            getPersona(endpoints.padron, ticketA5, tenant.cuit, cuil).catch(() => null)
          )
        )
      ).filter(Boolean);

      if (resultados.length === 0) {
        return reply.status(404).send({ error: 'DNI no encontrado en el Padrón AFIP' });
      }

      return reply.send({ resultados });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: message });
    }
  });
}
