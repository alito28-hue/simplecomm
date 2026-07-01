import type { FastifyInstance } from 'fastify';
import { feDummy } from '../wsfe/client';
import { feCompUltimoAutorizado } from '../wsfe/client';
import { feParamGetPtosVenta } from '../wsfe/client';
import { getValidTicket } from '../wsaa/cache';
import { endpoints, config } from '../config';
import { authenticateApiKey } from '../middleware/apikey';
import { db } from '../db/client';

export async function wsfeRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/wsfe/dummy
   * Verifica conectividad con WSFE (no requiere TA).
   */
  app.post('/v1/wsfe/dummy', {
    preHandler: authenticateApiKey,
  }, async (_request, reply) => {
    const start = Date.now();
    try {
      const result = await feDummy(endpoints.wsfe);
      return reply.send({
        ok: result.app === 'OK' && result.db === 'OK' && result.auth === 'OK',
        servers: result,
        environment: config.AFIP_ENV,
        wsfeUrl: endpoints.wsfe,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({
        ok: false,
        error: message,
        durationMs: Date.now() - start,
      });
    }
  });

  /**
   * GET /v1/wsfe/last-voucher/:ptoVta/:cbteType
   * Consulta el último número de comprobante emitido.
   */
  app.get<{
    Params: { ptoVta: string; cbteType: string };
  }>('/v1/wsfe/last-voucher/:ptoVta/:cbteType', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const ptoVta = parseInt(request.params.ptoVta);
    const cbteType = parseInt(request.params.cbteType);

    if (isNaN(ptoVta) || isNaN(cbteType)) {
      return reply.status(400).send({ error: 'ptoVta y cbteType deben ser números' });
    }

    try {
      const tenant = await db.tenant.findUnique({ where: { id: request.tenantId } });
      if (!tenant) return reply.status(404).send({ error: 'Tenant no encontrado' });

      const ticket = await getValidTicket(request.tenantId);
      const lastNro = await feCompUltimoAutorizado(
        endpoints.wsfe, ticket, tenant.cuit, ptoVta, cbteType
      );

      return reply.send({
        ptoVta,
        cbteType,
        lastNumber: lastNro,
        nextNumber: lastNro + 1,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: message });
    }
  });

  /**
   * GET /v1/wsfe/puntos-venta
   * Lista los puntos de venta habilitados en ARCA para el CUIT del tenant.
   */
  app.get('/v1/wsfe/puntos-venta', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    try {
      const tenant = await db.tenant.findUnique({ where: { id: request.tenantId } });
      if (!tenant) return reply.status(404).send({ error: 'Tenant no encontrado' });

      const ticket = await getValidTicket(request.tenantId);
      const puntosVenta = await feParamGetPtosVenta(endpoints.wsfe, ticket, tenant.cuit);

      return reply.send({
        puntosVenta,
        asignado: tenant.defaultPtoVta,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: message });
    }
  });
}
