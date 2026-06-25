import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { encrypt } from '../crypto/encrypt';
import { config } from '../config';

function requireAdminAuth(authHeader: string | undefined): boolean {
  if (!config.GATEWAY_ADMIN_SECRET) return false;
  return authHeader === `Bearer ${config.GATEWAY_ADMIN_SECRET}`;
}

const createTenantSchema = z.object({
  code:         z.string().min(2).max(50),    // ej: "acme_sa"
  name:         z.string().min(2),            // Razón social
  cuit:         z.string().regex(/^\d{11}$/, 'CUIT debe tener 11 dígitos sin guiones'),
  pto_vta:      z.number().int().positive(),
  environment:  z.enum(['production', 'homologation']).optional().default('production'),
  // Datos fiscales para el PDF de factura (opcional)
  address:             z.string().optional(),
  iibb:                z.string().optional(),
  activity_start_date: z.string().optional(), // ISO date, ej: "2026-01-01"
  // Credenciales propias (opcional — si no se envían, el tenant usa delegación)
  cert_pem:     z.string().optional(),
  key_pem:      z.string().optional(),
  chain_pem:    z.string().optional(),
});

const updateTenantSchema = z.object({
  name:                z.string().min(2).optional(),
  address:             z.string().optional(),
  iibb:                z.string().optional(),
  activity_start_date: z.string().optional(), // ISO date, ej: "2026-01-01"
});

export async function adminRoutes(app: FastifyInstance): Promise<void> {

  /**
   * POST /v1/admin/tenants
   * Registra un nuevo cliente (tenant) con sus credenciales AFIP.
   * Devuelve el API key en texto plano UNA SOLA VEZ — no se puede recuperar después.
   */
  app.post('/v1/admin/tenants', async (request, reply) => {
    if (!requireAdminAuth(request.headers.authorization)) {
      return reply.status(401).send({ error: 'Admin secret requerido' });
    }

    const parse = createTenantSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Payload inválido', details: parse.error.flatten().fieldErrors });
    }

    const body = parse.data;

    // Verificar que no exista el CUIT ya
    const existing = await db.tenant.findUnique({ where: { cuit: body.cuit } });
    if (existing) {
      return reply.status(409).send({ error: `Ya existe un tenant con CUIT ${body.cuit}`, tenant_id: existing.id });
    }

    // Crear tenant
    const tenant = await db.tenant.create({
      data: {
        code:              body.code,
        name:              body.name,
        cuit:              body.cuit,
        defaultPtoVta:     body.pto_vta,
        environment:       body.environment === 'production' ? 'PRODUCTION' : 'HOMOLOGATION',
        status:            'ACTIVE',
        address:           body.address,
        iibb:              body.iibb,
        activityStartDate: body.activity_start_date ? new Date(body.activity_start_date) : undefined,
      },
    });

    // Guardar credenciales propias si se enviaron
    if (body.cert_pem && body.key_pem && body.chain_pem) {
      const fingerprint = createHash('sha1')
        .update(body.cert_pem)
        .digest('hex');

      await db.tenantCredential.create({
        data: {
          tenantId:    tenant.id,
          certEnc:     encrypt(body.cert_pem),
          keyEnc:      encrypt(body.key_pem),
          chainEnc:    encrypt(body.chain_pem),
          fingerprint,
          active:      true,
        },
      });
    }

    // Generar API key: sc_live_{32 bytes hex}
    const rawKey    = `sc_live_${randomBytes(32).toString('hex')}`;
    const prefix    = rawKey.slice(0, 8);
    const keyHash   = await bcrypt.hash(rawKey, 10);

    await db.apiKey.create({
      data: {
        tenantId: tenant.id,
        name:     `${body.code}-primary`,
        keyHash,
        prefix,
        active:   true,
      },
    });

    return reply.status(201).send({
      tenant_id:      tenant.id,
      cuit:           tenant.cuit,
      name:           tenant.name,
      pto_vta:        tenant.defaultPtoVta,
      auth_method:    body.cert_pem ? 'certificate' : 'delegation',
      api_key:        rawKey,   // ⚠️ Solo visible esta vez
      api_key_prefix: prefix,
    });
  });

  /**
   * GET /v1/admin/tenants
   * Lista todos los tenants (sin exponer API keys).
   */
  app.get('/v1/admin/tenants', async (request, reply) => {
    if (!requireAdminAuth(request.headers.authorization)) {
      return reply.status(401).send({ error: 'Admin secret requerido' });
    }

    const tenants = await db.tenant.findMany({
      select: {
        id: true, code: true, name: true, cuit: true,
        defaultPtoVta: true, environment: true, status: true,
        address: true, iibb: true, activityStartDate: true,
        createdAt: true,
        credential: { select: { fingerprint: true, active: true, expiresAt: true } },
        apiKeys: { where: { active: true }, select: { prefix: true, name: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({ tenants });
  });

  /**
   * PATCH /v1/admin/tenants/:id
   * Actualiza datos fiscales de un tenant existente (domicilio, IIBB, fecha de inicio de actividades).
   */
  app.patch('/v1/admin/tenants/:id', async (request, reply) => {
    if (!requireAdminAuth(request.headers.authorization)) {
      return reply.status(401).send({ error: 'Admin secret requerido' });
    }

    const { id } = request.params as { id: string };
    const parse = updateTenantSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Payload inválido', details: parse.error.flatten().fieldErrors });
    }

    const body = parse.data;
    const tenant = await db.tenant.update({
      where: { id },
      data: {
        name:              body.name,
        address:           body.address,
        iibb:              body.iibb,
        activityStartDate: body.activity_start_date ? new Date(body.activity_start_date) : undefined,
      },
    });

    return reply.send({
      tenant_id: tenant.id,
      name: tenant.name,
      address: tenant.address,
      iibb: tenant.iibb,
      activity_start_date: tenant.activityStartDate,
    });
  });

  /**
   * DELETE /v1/admin/tenants/:id
   * Desactiva un tenant.
   */
  app.delete('/v1/admin/tenants/:id', async (request, reply) => {
    if (!requireAdminAuth(request.headers.authorization)) {
      return reply.status(401).send({ error: 'Admin secret requerido' });
    }

    const { id } = request.params as { id: string };

    await db.tenant.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await db.apiKey.updateMany({
      where: { tenantId: id },
      data: { active: false },
    });

    return reply.send({ ok: true });
  });
}
