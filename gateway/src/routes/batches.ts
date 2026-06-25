import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateApiKey } from '../middleware/apikey';
import { db } from '../db/client';
import { getValidTicket } from '../wsaa/cache';
import { feCompUltimoAutorizado, feCAESolicitar } from '../wsfe/client';
import { calculateFacturaB, toAfipDate, formatInvoiceNumber } from '../invoice/calculate';
import { generateInvoicePdf } from '../invoice/pdf';
import { endpoints } from '../config';
import { randomUUID } from 'node:crypto';

// Concurrencia máxima contra AFIP para no saturar el servicio
const CONCURRENCY = 5;

// Mapeo de códigos numéricos de tipo doc (AFIP) a strings internos
function mapAfipDocType(docType: string): string {
  const map: Record<string, string> = {
    '80': 'CUIT', '86': 'CUIL', '87': 'CDI',
    '96': 'DNI', '94': 'PASAPORTE', '99': 'CONSUMIDOR_FINAL',
    // También acepta strings directamente
    'CUIT': 'CUIT', 'CUIL': 'CUIL', 'DNI': 'DNI',
    'PASAPORTE': 'PASAPORTE', 'CONSUMIDOR_FINAL': 'CONSUMIDOR_FINAL',
  };
  return map[docType] ?? 'CONSUMIDOR_FINAL';
}

function mapDocTypeToAfipId(docType: string): number {
  const map: Record<string, number> = {
    'CUIT': 80, 'CUIL': 86, 'CDI': 87, 'DNI': 96,
    'PASAPORTE': 94, 'CONSUMIDOR_FINAL': 99,
  };
  return map[docType] ?? 99;
}

const batchItemSchema = z.object({
  batchItemId: z.string(),
  buyer: z.object({
    email: z.string().optional(),
    fullName: z.string(),
    documentType: z.string(),
    documentNumber: z.string().default('0'),
    billingMode: z.enum(['identified', 'consumer_final_anonymous']).default('consumer_final_anonymous'),
  }),
  invoice: z.object({
    type: z.literal('B'),
    currency: z.literal('ARS'),
    totalAmount: z.number().positive(),
    purchaseCount: z.number().optional(),
    firstPurchaseAt: z.string().nullable().optional(),
    lastPurchaseAt: z.string().nullable().optional(),
  }),
  metadata: z.record(z.unknown()).optional(),
});

const batchSchema = z.object({
  batchId: z.string(),
  raffle: z.object({ id: z.string(), name: z.string() }).optional(),
  items: z.array(batchItemSchema).min(1).max(5000),
});

type BatchResult =
  | {
      batchItemId: string;
      status: 'issued';
      invoiceNumber: string;
      cae: string | null;
      caeDueDate: Date | string | null;
      pdfBase64: string | null;
      rawResponse: unknown;
    }
  | {
      batchItemId: string;
      status: 'failed';
      error: string;
    };

export async function batchRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/batches/invoices
   *
   * Emite un lote de facturas en paralelo (hasta 5 simultáneas contra AFIP).
   * Diseñado específicamente para ClubSorteos y clientes que necesitan
   * facturación masiva post-cierre de sorteo/evento.
   *
   * Contrato acordado con ClubSorteos — ver documentación interna.
   */
  app.post('/v1/batches/invoices', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const parse = batchSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Payload inválido',
        details: parse.error.flatten().fieldErrors,
      });
    }

    const { batchId, raffle, items } = parse.data;
    const tenant = await db.tenant.findUnique({ where: { id: request.tenantId } });
    if (!tenant || tenant.status !== 'ACTIVE') {
      return reply.status(403).send({ error: 'Tenant inactivo' });
    }

    app.log.info(`[batch] Iniciando lote ${batchId} — ${items.length} ítems — tenant ${tenant.code}`);
    const startTime = Date.now();

    // Obtener TA una sola vez para todo el lote
    const ticket = await getValidTicket(request.tenantId);

    // Obtener el último número emitido para incrementar localmente
    // (evita N llamadas a FECompUltimoAutorizado)
    let lastNumber = await feCompUltimoAutorizado(
      endpoints.wsfe, ticket, tenant.cuit, tenant.defaultPtoVta, 6
    );

    const results: BatchResult[] = [];

    // Procesar en chunks de CONCURRENCY elementos en paralelo
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY);

      const chunkResults = await Promise.all(chunk.map(async (item): Promise<BatchResult> => {
        const idempotencyKey = `batch:${batchId}:item:${item.batchItemId}`;

        // Verificar idempotencia — si ya existe, devolver el resultado guardado
        const existing = await db.invoice.findUnique({
          where: { idempotencyKey },
          include: { artifact: true },
        });

        if (existing?.status === 'ISSUED') {
          return {
            batchItemId: item.batchItemId,
            status: 'issued',
            invoiceNumber: formatInvoiceNumber(existing.ptoVta, existing.invoiceNumber!),
            cae: existing.cae,
            caeDueDate: existing.caeDueDate,
            pdfBase64: existing.artifact?.pdfBase64 ?? null,
            rawResponse: existing.afipResponse,
          };
        }

        try {
          // Calcular importes
          const amounts = calculateFacturaB(item.invoice.totalAmount);
          const isConsumerFinal = item.buyer.billingMode === 'consumer_final_anonymous';
          const docTypeStr = isConsumerFinal ? 'CONSUMIDOR_FINAL' : mapAfipDocType(item.buyer.documentType);
          const docTypeId = mapDocTypeToAfipId(docTypeStr);
          const docNumber = isConsumerFinal ? '0' : (item.buyer.documentNumber || '0');

          // Asignar número secuencial (thread-safe dentro del lote)
          const invoiceNumber = ++lastNumber;

          // Solicitar CAE a AFIP
          const caeResult = await feCAESolicitar(endpoints.wsfe, ticket, tenant.cuit, {
            ptoVta: tenant.defaultPtoVta,
            cbteType: 6,
            concept: 1,
            docType: docTypeId,
            docNumber: docNumber.replace(/\D/g, ''),
            cbteDesde: invoiceNumber,
            cbteHasta: invoiceNumber,
            cbteFch: toAfipDate(),
            impTotal: amounts.impTotal,
            impTotConc: amounts.impTotConc,
            impNeto: amounts.impNeto,
            impOpEx: amounts.impOpEx,
            impIVA: amounts.impIVA,
            impTrib: amounts.impTrib,
            ivaItems: amounts.ivaItems,
          });

          // Generar PDF
          const pdfBase64 = await generateInvoicePdf({
            tenant,
            invoiceNumber: formatInvoiceNumber(tenant.defaultPtoVta, invoiceNumber),
            invoiceDate: toAfipDate(),
            buyer: {
              fullName: item.buyer.fullName,
              docType: docTypeStr,
              docNumber,
              email: item.buyer.email,
            },
            amounts,
            description: raffle ? `Participación sorteo: ${raffle.name}` : 'Venta',
            cae: caeResult.cae,
            caeDueDate: caeResult.caeFchVto,
          });

          // Persistir en DB
          const dbInvoice = existing
            ? await db.invoice.update({
                where: { id: existing.id },
                data: { invoiceNumber, cae: caeResult.cae, caeDueDate: caeResult.caeFchVto, status: 'ISSUED', afipResponse: caeResult as never },
              })
            : await db.invoice.create({
                data: {
                  id: randomUUID(),
                  tenantId: request.tenantId,
                  idempotencyKey,
                  ptoVta: tenant.defaultPtoVta,
                  invoiceType: 6,
                  invoiceNumber,
                  cae: caeResult.cae,
                  caeDueDate: caeResult.caeFchVto,
                  buyerDocType: docTypeId,
                  buyerDocNumber: docNumber,
                  buyerName: item.buyer.fullName,
                  totalAmount: amounts.impTotal,
                  netAmount: amounts.impNeto,
                  ivaAmount: amounts.impIVA,
                  concept: 1,
                  description: raffle?.name,
                  externalRef: item.batchItemId,
                  sourceApp: 'clubsorteos',
                  status: 'ISSUED',
                  afipResponse: caeResult as never,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });

          await db.invoiceArtifact.upsert({
            where: { invoiceId: dbInvoice.id },
            create: { id: randomUUID(), invoiceId: dbInvoice.id, pdfBase64 },
            update: { pdfBase64 },
          });

          return {
            batchItemId: item.batchItemId,
            status: 'issued',
            invoiceNumber: formatInvoiceNumber(tenant.defaultPtoVta, invoiceNumber),
            cae: caeResult.cae,
            caeDueDate: caeResult.caeFchVto,
            pdfBase64,
            rawResponse: caeResult,
          };

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          app.log.error(`[batch] Error en item ${item.batchItemId}: ${errorMsg}`);

          // Persistir error en DB para auditoría
          if (!existing) {
            await db.invoice.create({
              data: {
                id: randomUUID(),
                tenantId: request.tenantId,
                idempotencyKey,
                ptoVta: tenant.defaultPtoVta,
                invoiceType: 6,
                buyerDocType: 99,
                buyerDocNumber: '0',
                buyerName: item.buyer.fullName,
                totalAmount: item.invoice.totalAmount,
                netAmount: 0,
                ivaAmount: 0,
                concept: 1,
                externalRef: item.batchItemId,
                sourceApp: 'clubsorteos',
                status: 'ERROR',
                errorMessage: errorMsg,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            }).catch(() => {});
          }

          return { batchItemId: item.batchItemId, status: 'failed', error: errorMsg };
        }
      }));

      results.push(...chunkResults);
      app.log.info(`[batch] ${batchId}: ${results.length}/${items.length} procesados`);
    }

    const issued = results.filter((r) => r.status === 'issued').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const batchStatus = failed === 0 ? 'completed' : issued === 0 ? 'failed' : 'completed_with_errors';
    const durationMs = Date.now() - startTime;

    app.log.info(`[batch] ${batchId} finalizado — ${issued} ok, ${failed} errores — ${durationMs}ms`);

    return reply.send({
      batchId,
      status: batchStatus,
      summary: { total: items.length, issued, failed, durationMs },
      items: results,
    });
  });

  /**
   * GET /v1/batches/:batchId
   * Consulta el estado de un lote (por idempotency keys).
   */
  app.get<{ Params: { batchId: string } }>('/v1/batches/:batchId', {
    preHandler: authenticateApiKey,
  }, async (request, reply) => {
    const { batchId } = request.params;

    const invoices = await db.invoice.findMany({
      where: {
        tenantId: request.tenantId,
        idempotencyKey: { startsWith: `batch:${batchId}:item:` },
      },
      include: { artifact: true },
    });

    if (invoices.length === 0) {
      return reply.status(404).send({ error: 'Lote no encontrado' });
    }

    const issued = invoices.filter(i => i.status === 'ISSUED').length;
    const failed = invoices.filter(i => i.status === 'ERROR').length;

    return reply.send({
      batchId,
      total: invoices.length,
      issued,
      failed,
      status: failed === 0 ? 'completed' : issued === 0 ? 'failed' : 'completed_with_errors',
      items: invoices.map(inv => ({
        batchItemId: inv.externalRef,
        status: inv.status === 'ISSUED' ? 'issued' : 'failed',
        invoiceNumber: inv.invoiceNumber ? formatInvoiceNumber(inv.ptoVta, inv.invoiceNumber) : null,
        cae: inv.cae,
        caeDueDate: inv.caeDueDate,
        pdfBase64: inv.artifact?.pdfBase64 ?? null,
        error: inv.errorMessage,
      })),
    });
  });
}
