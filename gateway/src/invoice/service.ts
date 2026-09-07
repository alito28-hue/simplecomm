import { randomUUID } from 'node:crypto';
import { db } from '../db/client';
import { getValidTicket, invalidateTicket } from '../wsaa/cache';
import { feCompUltimoAutorizado, feCAESolicitar } from '../wsfe/client';
import { calculateByType, CBTE_TYPE, NC_TYPE, letterFromCbteType, toAfipDate, isoToAfipDate, docTypeToAfipId, formatInvoiceNumber, parseIvaRate, type InvoiceLetterType, type IvaRateId, type InvoiceAmounts } from './calculate';
import { generateInvoicePdf } from './pdf';
import { endpoints } from '../config';

export interface IssueRequest {
  tenantId: string;
  idempotencyKey: string;
  ptoVta: number;
  buyer: {
    fullName: string;
    docType: string;        // "DNI", "CUIT", "CONSUMIDOR_FINAL", etc.
    docNumber: string;
    email?: string;
    address?: string;
  };
  invoice: {
    totalAmount: number;    // Para B/C: total con IVA. Para A: monto NETO
    invoiceLetter?: InvoiceLetterType; // 'A' | 'B' | 'C' (default 'B')
    ivaRate?: number;       // 21, 10.5, 27, 0 (default 21)
    concept?: number;       // 1=Productos, 2=Servicios, 3=Ambos (default 1)
    description?: string;
    serviceDateFrom?: string;  // YYYY-MM-DD — obligatorio si concept es 2 o 3
    serviceDateTo?: string;    // YYYY-MM-DD — obligatorio si concept es 2 o 3
    paymentDueDate?: string;   // YYYY-MM-DD — obligatorio si concept es 2 o 3
    currency?: string;         // AFIP MonId: "PES" (default) o "DOL"
    exchangeRate?: number;     // AFIP MonCotiz; requerido y >1 si currency !== "PES"
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
  buyerName?: string;
}

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

  // Facturas de servicios (concept 2 o 3) requieren período facturado y vencimiento de pago
  if (concept !== 1 && (!req.invoice.serviceDateFrom || !req.invoice.serviceDateTo || !req.invoice.paymentDueDate)) {
    throw new Error('Facturas de servicios requieren fecha desde, fecha hasta y vencimiento de pago del período facturado');
  }
  const fchServDesde = req.invoice.serviceDateFrom ? isoToAfipDate(req.invoice.serviceDateFrom) : undefined;
  const fchServHasta = req.invoice.serviceDateTo ? isoToAfipDate(req.invoice.serviceDateTo) : undefined;
  const fchVtoPago = req.invoice.paymentDueDate ? isoToAfipDate(req.invoice.paymentDueDate) : undefined;

  // ── Moneda ───────────────────────────────────────────────────────────────
  const monId = req.invoice.currency ?? 'PES';
  if (monId !== 'PES' && (!req.invoice.exchangeRate || req.invoice.exchangeRate <= 1)) {
    throw new Error('Facturas en moneda distinta a pesos requieren la cotización del día (mayor a 1)');
  }
  const monCotiz = monId === 'PES' ? 1 : req.invoice.exchangeRate!;

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
          buyerAddress: req.buyer.address,
          totalAmount: amounts.impTotal,
          netAmount: amounts.impNeto,
          ivaAmount: amounts.impIVA,
          concept,
          moneda: monId,
          cotizacion: monCotiz,
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
      fchServDesde,
      fchServHasta,
      fchVtoPago,
      monId,
      monCotiz,
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
      serviceDateFrom: fchServDesde,
      serviceDateTo: fchServHasta,
      paymentDueDate: fchVtoPago,
      currency: monId,
      exchangeRate: monCotiz,
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

    // Si es error de autenticación WSAA (TA inválido/expirado), invalidar el TA cacheado para
    // forzar renovación. OJO: no matchear por "token" en general — el error de WSFE
    // "ValidacionDeToken: No aparecio CUIT en lista de relaciones" contiene "Token" en el nombre
    // pero es un problema de relación/delegación, no de vigencia del TA, y no se arregla renovándolo.
    if (message.startsWith('WSAA ')) {
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

export interface CreditNoteRequest {
  tenantId: string;
  idempotencyKey: string;
  originalInvoiceId: string;
  sourceApp?: string;
}

/**
 * Emite una Nota de Crédito TOTAL por una factura ya emitida — anula el comprobante completo
 * (no soporta notas de crédito parciales todavía). A diferencia de issueInvoice, TODOS los
 * datos (letra, punto de venta, receptor, montos, moneda) se toman de la factura original
 * guardada en nuestra propia base — nunca de lo que reenvíe quien llama, para no repetir el
 * bug de "letra mal derivada" que hacía pedir una Factura B común en vez de una Nota de
 * Crédito C. AFIP exige que la NC referencie el comprobante
 * original vía CbtesAsoc y se emita desde el mismo punto de venta y con el mismo CUIT.
 */
export async function issueCreditNote(req: CreditNoteRequest): Promise<IssueResult> {
  const requestId = randomUUID();

  const existing = await db.invoice.findUnique({
    where: { idempotencyKey: req.idempotencyKey },
  });
  if (existing) {
    if (existing.status === 'ISSUED') {
      const artifact = await db.invoiceArtifact.findUnique({ where: { invoiceId: existing.id } });
      return {
        status: 'duplicate',
        invoiceId: existing.id,
        invoiceNumber: formatInvoiceNumber(existing.ptoVta, existing.invoiceNumber!),
        cae: existing.cae!,
        caeDueDate: existing.caeDueDate!,
        pdfBase64: artifact?.pdfBase64 ?? '',
        buyerName: existing.buyerName,
      };
    }
  }

  const tenant = await db.tenant.findUnique({ where: { id: req.tenantId } });
  if (!tenant || tenant.status !== 'ACTIVE') {
    throw new Error(`Tenant ${req.tenantId} no encontrado o inactivo`);
  }

  const original = await db.invoice.findFirst({
    where: { id: req.originalInvoiceId, tenantId: req.tenantId },
  });
  if (!original) throw new Error('Factura original no encontrada');
  if (original.status !== 'ISSUED' || !original.cae || original.invoiceNumber == null) {
    throw new Error('La factura original no está emitida (sin CAE) — no se le puede hacer una Nota de Crédito');
  }
  if (original.concept !== 1) {
    // FchServDesde/Hasta/FchVtoPago son obligatorios en AFIP para concept 2/3 y no los
    // persistimos de la factura original — evitamos mandarle a WSFE una solicitud que sabemos
    // que va a rechazar, en vez de fallar con un error críptico de AFIP.
    throw new Error('Todavía no soportamos Notas de Crédito para facturas de servicios (concepto 2/3) — falta el período facturado original');
  }

  const invoiceLetter: InvoiceLetterType = letterFromCbteType(original.invoiceType);
  const cbteType = NC_TYPE[invoiceLetter];

  const impNeto = Number(original.netAmount);
  const impIVA = Number(original.ivaAmount);
  const impTotal = Number(original.totalAmount);
  const ivaRateId: IvaRateId | null = impIVA > 0 && impNeto > 0 ? parseIvaRate((impIVA / impNeto) * 100) : null;
  const amounts: InvoiceAmounts = {
    impNeto,
    impIVA,
    impTotal,
    impTotConc: 0,
    impOpEx: 0,
    impTrib: 0,
    ivaItems: ivaRateId != null ? [{ id: ivaRateId, baseImp: impNeto, importe: impIVA }] : [],
  };

  const cbteFch = toAfipDate();

  const dbInvoice = existing
    ? await db.invoice.update({
        where: { id: existing.id },
        data: { status: 'PENDING', errorMessage: null },
      })
    : await db.invoice.create({
        data: {
          tenantId: req.tenantId,
          idempotencyKey: req.idempotencyKey,
          ptoVta: original.ptoVta,
          invoiceType: cbteType,
          buyerDocType: original.buyerDocType,
          buyerDocNumber: original.buyerDocNumber,
          buyerName: original.buyerName,
          buyerAddress: original.buyerAddress,
          totalAmount: amounts.impTotal,
          netAmount: amounts.impNeto,
          ivaAmount: amounts.impIVA,
          concept: original.concept,
          moneda: original.moneda,
          cotizacion: original.cotizacion,
          description: `Nota de crédito — ${formatInvoiceNumber(original.ptoVta, original.invoiceNumber)}`,
          relatedInvoiceId: original.id,
          sourceApp: req.sourceApp,
          status: 'PENDING',
        },
      });

  try {
    await log(req.tenantId, dbInvoice.id, requestId, 'wsaa', null, true, 'Obteniendo TA');
    const ticket = await getValidTicket(req.tenantId);

    await log(req.tenantId, dbInvoice.id, requestId, 'wsfe_last', 'pkijs', true, 'Consultando último comprobante');
    const lastNumber = await feCompUltimoAutorizado(
      endpoints.wsfe, ticket, tenant.cuit, original.ptoVta, cbteType
    );
    const nextNumber = lastNumber + 1;

    await log(req.tenantId, dbInvoice.id, requestId, 'wsfe_issue', 'pkijs', true, `Solicitando CAE para NC ${nextNumber}`);
    const result = await feCAESolicitar(endpoints.wsfe, ticket, tenant.cuit, {
      ptoVta: original.ptoVta,
      cbteType,
      concept: original.concept,
      docType: original.buyerDocType,
      docNumber: original.buyerDocNumber,
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
      monId: original.moneda,
      monCotiz: Number(original.cotizacion),
      cbtesAsoc: [{ tipo: original.invoiceType, ptoVta: original.ptoVta, nro: original.invoiceNumber }],
    });

    await log(req.tenantId, dbInvoice.id, requestId, 'pdf', 'pkijs', true, 'Generando PDF');
    const pdfBase64 = await generateInvoicePdf({
      tenant,
      invoiceNumber: formatInvoiceNumber(original.ptoVta, result.cbteNro),
      invoiceDate: cbteFch,
      invoiceLetter,
      docLabel: 'NOTA DE CRÉDITO',
      cbteTypeCode: cbteType,
      buyer: {
        fullName: original.buyerName,
        docType: original.buyerDocType === 80 ? 'CUIT' : original.buyerDocType === 96 ? 'DNI' : 'CONSUMIDOR_FINAL',
        docNumber: original.buyerDocNumber,
        address: original.buyerAddress ?? undefined,
      },
      amounts,
      description: dbInvoice.description ?? undefined,
      cae: result.cae,
      caeDueDate: result.caeFchVto,
      currency: original.moneda,
      exchangeRate: Number(original.cotizacion),
    });

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
      `Nota de crédito emitida: ${formatInvoiceNumber(original.ptoVta, result.cbteNro)} | CAE: ${result.cae}`);

    return {
      status: 'issued',
      invoiceId: dbInvoice.id,
      invoiceNumber: formatInvoiceNumber(original.ptoVta, result.cbteNro),
      cae: result.cae,
      caeDueDate: result.caeFchVto,
      pdfBase64,
      buyerName: original.buyerName,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith('WSAA ')) {
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
