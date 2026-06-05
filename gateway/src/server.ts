import 'dotenv/config';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { wsfeRoutes } from './routes/wsfe';
import { invoiceRoutes } from './routes/invoices';
import { batchRoutes } from './routes/batches';

async function main() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  await app.register(helmet);
  await app.register(cors, { origin: false });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Demasiadas solicitudes. Esperá un momento.',
    }),
  });

  // ── Health check (sin auth) ────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'simplecomm-gateway',
    environment: config.AFIP_ENV,
    timestamp: new Date().toISOString(),
  }));

  // ── Rutas ─────────────────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(wsfeRoutes);
  await app.register(invoiceRoutes);
  await app.register(batchRoutes);

  // ── Error handler global ───────────────────────────────────────────────
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: config.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : error.message,
    });
  });

  // ── Arrancar ───────────────────────────────────────────────────────────
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info(`SimpleComm Gateway corriendo en http://0.0.0.0:${config.PORT}`);
    app.log.info(`Ambiente AFIP: ${config.AFIP_ENV.toUpperCase()}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
