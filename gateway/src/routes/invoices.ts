import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { issueInvoice } from '../invoice/service';
import { authenticateApiKey } from '../middleware/apikey';
import { db } from '../db/client';

const issueSchema = z.object({
  idempotency_key: z.string().min(1).max(255),
  invoice: z.object({
    total_amount: z.number().positive(),
    concept: z.number().int().min(1).max(3).optional(),
    description: z.string().optional(),
    pto_vta: z.number().int().positive().optional(),
  }),
  buyer: z.object({
    full_name: z.string().min(1),
    doc_type: z.enum(['DNI', 'CUIT', 'CUIL', 'CDI', 'PASAPORTE', 'CONSUMIDOR_FINAL']),
    doc_number: z.string().default('0'),
    email: z.string().email().optional(),
  }),
  external_ref: z.string().optional(),
  source_app: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/invoices/issue
   * Emite una Factura B. Idempotente por idempotency_key.
   */
  app.post('/v1/invoices/issue', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const parse = issueSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Payload inválido',
        details: parse.error.flatten().fieldErrors,
      });
    }

    const body = parse.data;

    const tenant = await db.tenant.findUnique({ where: { id: request.tenantId } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant no encontrado' });

    const ptoVta = body.invoice.pto_vta ?? tenant.defaultPtoVta;

    try {
      const result = await issueInvoice({
        tenantId: request.tenantId,
        idempotencyKey: body.idempotency_key,
        ptoVta,
        buyer: {
          fullName: body.buyer.full_name,
          docType: body.buyer.doc_type,
          docNumber: body.buyer.doc_number,
          email: body.buyer.email,
        },
        invoice: {
          totalAmount: body.invoice.total_amount,
          concept: body.invoice.concept,
          description: body.invoice.description,
        },
        externalRef: body.external_ref,
        sourceApp: body.source_app,
        metadata: body.metadata,
      });

      const statusCode = result.status === 'duplicate' ? 200 : 201;

      return reply.status(statusCode).send({
        status: result.status,
        invoice_id: result.invoiceId,
        invoice_number: result.invoiceNumber,
        cae: result.cae,
        cae_due_date: result.caeDueDate,
        pdf_base64: result.pdfBase64,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      app.log.error({ err, tenantId: request.tenantId }, 'Error emitiendo factura');
      return reply.status(502).send({ error: message });
    }
  });

  /**
   * GET /v1/invoices/:id
   * Consulta el estado de una factura.
   */
  app.get<{ Params: { id: string } }>('/v1/invoices/:id', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const invoice = await db.invoice.findFirst({
      where: { id: request.params.id, tenantId: request.tenantId },
    });

    if (!invoice) return reply.status(404).send({ error: 'Factura no encontrada' });

    return reply.send({
      invoice_id: invoice.id,
      status: invoice.status.toLowerCase(),
      invoice_number: invoice.invoiceNumber
        ? `${String(invoice.ptoVta).padStart(4,'0')}-${String(invoice.invoiceNumber).padStart(8,'0')}`
        : null,
      cae: invoice.cae,
      cae_due_date: invoice.caeDueDate,
      total_amount: Number(invoice.totalAmount),
      buyer_name: invoice.buyerName,
      created_at: invoice.createdAt.toISOString(),
      error: invoice.errorMessage,
    });
  });

  /**
   * GET /v1/invoices/:id/pdf
   * Devuelve el PDF de una factura (base64).
   */
  app.get<{ Params: { id: string } }>('/v1/invoices/:id/pdf', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const artifact = await db.invoiceArtifact.findFirst({
      where: { invoice: { id: request.params.id, tenantId: request.tenantId } },
    });

    if (!artifact?.pdfBase64) {
      return reply.status(404).send({ error: 'PDF no disponible' });
    }

    // Devolver como PDF directamente
    const pdfBuffer = Buffer.from(artifact.pdfBase64, 'base64');
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="factura-${request.params.id}.pdf"`)
      .send(pdfBuffer);
  });

  /**
   * POST /v1/invoices/:id/retry
   * Reintenta la emisión de una factura en estado ERROR.
   */
  app.post<{ Params: { id: string } }>('/v1/invoices/:id/retry', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const invoice = await db.invoice.findFirst({
      where: { id: request.params.id, tenantId: request.tenantId, status: 'ERROR' },
    });

    if (!invoice) {
      return reply.status(404).send({
        error: 'Factura no encontrada o no está en estado ERROR',
      });
    }

    // Resetear a PENDING para que el service la reintente
    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PENDING', errorMessage: null },
    });

    return reply.send({ message: 'Factura marcada para reintento. Llamar POST /v1/invoices/issue con el mismo idempotency_key.' });
  });
}
