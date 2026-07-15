import type { FastifyInstance } from 'fastify';
import { getPersona, getIdPersonaListByDocumento } from '../padron/client';
import { getValidTicket, getCredentialOwnerCuit } from '../wsaa/cache';
import { endpoints } from '../config';
import { authenticateApiKey } from '../middleware/apikey';

export async function padronRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { cuil: string } }>('/v1/padron/:cuil', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const clean = request.params.cuil.replace(/[-\s]/g, '');
    if (!/^\d{11}$/.test(clean)) {
      return reply.status(400).send({ error: 'CUIL inválido. Debe tener 11 dígitos.' });
    }

    try {
      // "cuitRepresentada" tiene que ser el dueño real del certificado (Mocla, si el tenant
      // factura por delegación) — no el CUIT del tenant. La consulta de Padrón de un tercero
      // no depende de que ese tercero haya delegado nada, solo de que el dueño del
      // certificado tenga el servicio de Padrón habilitado en su propia cuenta de ARCA.
      const cuitRepresentada = await getCredentialOwnerCuit(request.tenantId);
      const ticket = await getValidTicket(request.tenantId, 'ws_sr_padron_a13');
      const persona = await getPersona(endpoints.padron, ticket, cuitRepresentada, clean);
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
   * Usa getIdPersonaListByDocumento de A13 — búsqueda directa por DNI sin módulo 11.
   */
  app.get<{ Params: { dni: string } }>('/v1/padron/por-dni/:dni', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const clean = request.params.dni.replace(/\D/g, '');
    if (!/^\d{7,8}$/.test(clean)) {
      return reply.status(400).send({ error: 'DNI inválido. Debe tener 7 u 8 dígitos.' });
    }

    try {
      const cuitRepresentada = await getCredentialOwnerCuit(request.tenantId);
      const ticket = await getValidTicket(request.tenantId, 'ws_sr_padron_a13');
      const cuils = await getIdPersonaListByDocumento(endpoints.padron, ticket, cuitRepresentada, clean);

      if (cuils.length === 0) {
        return reply.status(404).send({ error: 'DNI no encontrado en el Padrón AFIP' });
      }

      const resultados = (
        await Promise.all(
          cuils.map(cuil =>
            getPersona(endpoints.padron, ticket, cuitRepresentada, cuil).catch(() => null)
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
