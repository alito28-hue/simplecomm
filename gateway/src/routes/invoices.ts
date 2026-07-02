import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { issueInvoice } from '../invoice/service';
import { authenticateApiKey } from '../middleware/apikey';
import { db } from '../db/client';

const issueSchema = z.object({
  idempotency_key: z.string().min(1).max(255),
  invoice: z.object({
    total_amount: z.number().positive(),
    invoice_letter: z.enum(['A', 'B', 'C']).optional().default('B'),
    iva_rate: z.number().optional().default(21),
    concept: z.number().int().min(1).max(3).optional(),
    description: z.string().optional(),
    pto_vta: z.number().int().positive().optional(),
    service_date_from: z.string().optional(),  // YYYY-MM-DD, requerido si concept es 2 o 3
    service_date_to: z.string().optional(),    // YYYY-MM-DD, requerido si concept es 2 o 3
    payment_due_date: z.string().optional(),   // YYYY-MM-DD, requerido si concept es 2 o 3
    currency: z.enum(['PES', 'DOL']).optional(),
    exchange_rate: z.number().positive().optional(),
  }),
  buyer: z.object({
    full_name: z.string().min(1),
    doc_type: z.string().default('CONSUMIDOR_FINAL'),
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
          invoiceLetter: body.invoice.invoice_letter as 'A' | 'B' | 'C' | undefined,
          ivaRate: body.invoice.iva_rate,
          concept: body.invoice.concept,
          description: body.invoice.description,
          serviceDateFrom: body.invoice.service_date_from,
          serviceDateTo: body.invoice.service_date_to,
          paymentDueDate: body.invoice.payment_due_date,
          currency: body.invoice.currency,
          exchangeRate: body.invoice.exchange_rate,
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
      include: { invoice: { include: { tenant: true } } },
    });

    if (!artifact?.pdfBase64) {
      return reply.status(404).send({ error: 'PDF no disponible' });
    }

    // Nombre de archivo estándar AFIP: {CUIT}_{tipoCbte:3}_{ptoVta:5}_{nroCbte:8}.pdf
    const inv = artifact.invoice;
    const filename = `${inv.tenant.cuit}_${String(inv.invoiceType).padStart(3, '0')}_${String(inv.ptoVta).padStart(5, '0')}_${String(inv.invoiceNumber ?? 0).padStart(8, '0')}.pdf`;

    // Devolver como PDF directamente
    const pdfBuffer = Buffer.from(artifact.pdfBase64, 'base64');
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
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

  /**
   * GET /v1/invoices
   * Lista todas las facturas del tenant con paginación.
   */
  app.get<{
    Querystring: { page?: string; limit?: string; status?: string; source_app?: string; buyer_doc?: string; date_from?: string; date_to?: string };
  }>('/v1/invoices', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1'));
    const limit = Math.min(100, parseInt(request.query.limit ?? '20'));
    const skip  = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId: request.tenantId };
    if (request.query.status)     where.status     = request.query.status.toUpperCase();
    if (request.query.buyer_doc)  where.buyerDocNumber = request.query.buyer_doc;
    if (request.query.source_app) where.sourceApp  = request.query.source_app;
    if (request.query.date_from || request.query.date_to) {
      where.createdAt = {
        ...(request.query.date_from ? { gte: new Date(request.query.date_from) } : {}),
        ...(request.query.date_to   ? { lte: new Date(request.query.date_to) }   : {}),
      };
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.invoice.count({ where }),
    ]);

    return reply.send({
      data: invoices.map(inv => ({
        invoice_id:     inv.id,
        invoice_number: inv.invoiceNumber
          ? `${String(inv.ptoVta).padStart(4,'0')}-${String(inv.invoiceNumber).padStart(8,'0')}`
          : null,
        pto_vta:        inv.ptoVta,
        invoice_number_int: inv.invoiceNumber,
        status:         inv.status.toLowerCase(),
        buyer_name:     inv.buyerName,
        buyer_doc:      inv.buyerDocNumber,
        total_amount:   Number(inv.totalAmount),
        net_amount:     Number(inv.netAmount),
        iva_amount:     Number(inv.ivaAmount),
        invoice_type:   inv.invoiceType,
        cae:            inv.cae,
        cae_due_date:   inv.caeDueDate,
        description:    inv.description,
        external_ref:   inv.externalRef,
        source_app:     inv.sourceApp,
        created_at:     inv.createdAt.toISOString(),
        error:          inv.errorMessage,
      })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });
}
