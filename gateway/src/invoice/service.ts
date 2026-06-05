import { randomUUID } from 'node:crypto';
import { db } from '../db/client';
import { getValidTicket, invalidateTicket } from '../wsaa/cache';
import { feCompUltimoAutorizado, feCAESolicitar } from '../wsfe/client';
import { calculateByType, CBTE_TYPE, toAfipDate, docTypeToAfipId, formatInvoiceNumber, parseIvaRate, type InvoiceLetterType, type IvaRateId } from './calculate';
import { generateInvoicePdf } from './pdf';
import { endpoints, config } from '../config';

export interface IssueRequest {
  tenantId: string;
  idempotencyKey: string;
  ptoVta: number;
  buyer: {
    fullName: string;
    docType: string;        // "DNI", "CUIT", "CONSUMIDOR_FINAL", etc.
    docNumber: string;
    email?: string;
  };
  invoice: {
    totalAmount: number;    // Para B/C: total con IVA. Para A: monto NETO
    invoiceLetter?: InvoiceLetterType; // 'A' | 'B' | 'C' (default 'B')
    ivaRate?: number;       // 21, 10.5, 27, 0 (default 21)
    concept?: number;       // 1=Productos, 2=Servicios, 3=Ambos (default 1)
    description?: string;
  };
  externalRef?: string;
  sourceApp?: string;
  metadata?: Record<string, unknown>;
}

export interface IssueResult {
  status: 'issued' | 'duplicate';
  invoiceId: string;
  invoiceNumber: string;
  cae: string;
  caeDueDate: string;
  pdfBase64: string;
}

// Mantenemos para compatibilidad pero ahora usamos cbteType dinámico
const CBTE_TYPE_FACTURA_B = 6;

/**
 * Orquesta la emisión completa de una Factura B.
 * Idempotente: si idempotencyKey ya existe y fue emitida, devuelve el resultado previo.
 */
export async function issueInvoice(req: IssueRequest): Promise<IssueResult> {
  const requestId = randomUUID();

  // ── Idempotencia ────────────────────────────────────────────────────────
  const existing = await db.invoice.findUnique({
    where: { idempotencyKey: req.idempotencyKey },
    include: { artifact: true },
  });

  if (existing) {
    if (existing.status === 'ISSUED') {
      return {
        status: 'duplicate',
        invoiceId: existing.id,
        invoiceNumber: formatInvoiceNumber(existing.ptoVta, existing.invoiceNumber!),
        cae: existing.cae!,
        caeDueDate: existing.caeDueDate!,
        pdfBase64: existing.artifact?.pdfBase64 ?? '',
      };
    }
    // Si está en PENDING o ERROR, reintentamos
  }

  // ── Validar tenant ───────────────────────────────────────────────────────
  const tenant = await db.tenant.findUnique({ where: { id: req.tenantId } });
  if (!tenant || tenant.status !== 'ACTIVE') {
    throw new Error(`Tenant ${req.tenantId} no encontrado o inactivo`);
  }

  // ── Calcular importes ────────────────────────────────────────────────────
  const invoiceLetter: InvoiceLetterType = req.invoice.invoiceLetter ?? 'B';
  const ivaRateId: IvaRateId = parseIvaRate(req.invoice.ivaRate ?? 21);
  const cbteType = CBTE_TYPE[invoiceLetter];

  // Para Factura A, el receptor debe tener CUIT
  if (invoiceLetter === 'A' && !['CUIT','CUIL'].includes(req.buyer.docType.toUpperCase())) {
    throw new Error('Factura A requiere receptor con CUIT o CUIL');
  }

  const amounts = calculateByType(req.invoice.totalAmount, invoiceLetter, ivaRateId);
  const docTypeId = docTypeToAfipId(req.buyer.docType);
  const docNumber = docTypeId === 99 ? '0' : req.buyer.docNumber.replace(/\D/g, '');
  const cbteFch = toAfipDate();
  const concept = req.invoice.concept ?? 1;

  // ── Crear o actualizar registro en DB ────────────────────────────────────
  const dbInvoice = existing
    ? await db.invoice.update({
        where: { id: existing.id },
        data: { status: 'PENDING', errorMessage: null },
      })
    : await db.invoice.create({
        data: {
          tenantId: req.tenantId,
          idempotencyKey: req.idempotencyKey,
          ptoVta: req.ptoVta,
          invoiceType: cbteType,
          buyerDocType: docTypeId,
          buyerDocNumber: docNumber,
          buyerName: req.buyer.fullName,
          totalAmount: amounts.impTotal,
          netAmount: amounts.impNeto,
          ivaAmount: amounts.impIVA,
          concept,
          description: req.invoice.description,
          externalRef: req.externalRef,
          sourceApp: req.sourceApp,
          status: 'PENDING',
        },
      });

  try {
    // ── Obtener TA válido ──────────────────────────────────────────────────
    await log(req.tenantId, dbInvoice.id, requestId, 'wsaa', null, true, 'Obteniendo TA');
    const ticket = await getValidTicket(req.tenantId);

    // ── Obtener último número de comprobante ──────────────────────────────
    await log(req.tenantId, dbInvoice.id, requestId, 'wsfe_last', 'pkijs', true, 'Consultando último comprobante');
    const lastNumber = await feCompUltimoAutorizado(
      endpoints.wsfe, ticket, tenant.cuit, req.ptoVta, cbteType
    );
    const nextNumber = lastNumber + 1;

    // ── Solicitar CAE ─────────────────────────────────────────────────────
    await log(req.tenantId, dbInvoice.id, requestId, 'wsfe_issue', 'pkijs', true, `Solicitando CAE para comprobante ${nextNumber}`);
    const result = await feCAESolicitar(endpoints.wsfe, ticket, tenant.cuit, {
      ptoVta: req.ptoVta,
      cbteType,
      concept,
      docType: docTypeId,
      docNumber,
      cbteDesde: nextNumber,
      cbteHasta: nextNumber,
      cbteFch,
      impTotal: amounts.impTotal,
      impTotConc: amounts.impTotConc,
      impNeto: amounts.impNeto,
      impOpEx: amounts.impOpEx,
      impIVA: amounts.impIVA,
      impTrib: amounts.impTrib,
      ivaItems: amounts.ivaItems,
    });

    // ── Generar PDF ───────────────────────────────────────────────────────
    await log(req.tenantId, dbInvoice.id, requestId, 'pdf', 'pkijs', true, 'Generando PDF');
    const pdfBase64 = await generateInvoicePdf({
      tenant,
      invoiceNumber: formatInvoiceNumber(req.ptoVta, result.cbteNro),
      invoiceDate: cbteFch,
      invoiceLetter,
      buyer: req.buyer,
      amounts,
      description: req.invoice.description,
      cae: result.cae,
      caeDueDate: result.caeFchVto,
    });

    // ── Persistir resultado ───────────────────────────────────────────────
    await db.invoice.update({
      where: { id: dbInvoice.id },
      data: {
        invoiceNumber: result.cbteNro,
        cae: result.cae,
        caeDueDate: result.caeFchVto,
        status: 'ISSUED',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        afipResponse: result as any,
      },
    });

    await db.invoiceArtifact.upsert({
      where: { invoiceId: dbInvoice.id },
      create: { invoiceId: dbInvoice.id, pdfBase64 },
      update: { pdfBase64 },
    });

    await log(req.tenantId, dbInvoice.id, requestId, 'issued', 'pkijs', true,
      `Factura emitida: ${formatInvoiceNumber(req.ptoVta, result.cbteNro)} | CAE: ${result.cae}`);

    return {
      status: 'issued',
      invoiceId: dbInvoice.id,
      invoiceNumber: formatInvoiceNumber(req.ptoVta, result.cbteNro),
      cae: result.cae,
      caeDueDate: result.caeFchVto,
      pdfBase64,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Si es error de autenticación WSAA, invalidar el TA para forzar renovación
    if (message.toLowerCase().includes('wsaa') || message.toLowerCase().includes('token')) {
      await invalidateTicket(req.tenantId).catch(() => {});
    }

    await db.invoice.update({
      where: { id: dbInvoice.id },
      data: { status: 'ERROR', errorMessage: message },
    });

    await log(req.tenantId, dbInvoice.id, requestId, 'error', null, false, message);
    throw err;
  }
}

async function log(
  tenantId: string,
  invoiceId: string | null,
  requestId: string,
  stage: string,
  signer: string | null,
  success: boolean,
  message: string
): Promise<void> {
  await db.providerLog.create({
    data: { tenantId, invoiceId, requestId, stage, signer, success, message },
  }).catch(() => {}); // No fallar si el log falla
}
