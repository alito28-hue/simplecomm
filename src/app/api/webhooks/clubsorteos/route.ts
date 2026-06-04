import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL     = process.env.GATEWAY_URL     ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';
const WEBHOOK_SECRET  = process.env.CLUBSORTEOS_WEBHOOK_SECRET ?? '';

// Tipos exactos del invoicing-connector.ts de ClubSorteos
interface InvoiceIssuePayload {
  batchId: string;
  batchItemId: string;
  raffle: { id: string; name: string };
  buyer: {
    email: string;
    fullName: string;
    documentType: string;
    documentNumber: string;
    billingMode: 'identified' | 'consumer_final_anonymous';
  };
  invoice: {
    type: 'B';
    currency: 'ARS';
    totalAmount: number;
    purchaseCount: number;
    firstPurchaseAt: string | null;
    lastPurchaseAt: string | null;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Webhook ClubSorteos → SimpleComm → Gateway AFIP
 *
 * ClubSorteos llama con:
 *   POST /api/webhooks/clubsorteos
 *   Authorization: Bearer <CLUBSORTEOS_WEBHOOK_SECRET>
 *   Content-Type: application/json
 *   Body: InvoiceIssuePayload
 *
 * Devuelve:
 *   { invoiceNumber, cae, caeDueDate, pdfBase64, rawResponse }
 */
export async function POST(req: NextRequest) {
  // Autenticación via Bearer token (igual que el connector de ClubSorteos)
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: InvoiceIssuePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.batchItemId || !body.invoice?.totalAmount) {
    return NextResponse.json({ error: 'batchItemId e invoice.totalAmount son requeridos' }, { status: 400 });
  }

  // Mapear billingMode/documentType al formato del Gateway
  const isConsumerFinal = body.buyer.billingMode === 'consumer_final_anonymous';
  const docType = isConsumerFinal
    ? 'CONSUMIDOR_FINAL'
    : mapDocType(body.buyer.documentType);
  const docNumber = isConsumerFinal ? '0' : (body.buyer.documentNumber || '0');

  const gatewayPayload = {
    idempotency_key: `clubsorteos:batch:${body.batchId}:item:${body.batchItemId}`,
    invoice: {
      total_amount: body.invoice.totalAmount,
      concept:      1,
      description:  `Participación sorteo: ${body.raffle.name}`,
    },
    buyer: {
      full_name:   body.buyer.fullName,
      doc_type:    docType,
      doc_number:  docNumber,
      email:       body.buyer.email,
    },
    source_app:   'clubsorteos',
    external_ref: body.batchItemId,
    metadata: {
      batchId:    body.batchId,
      raffleId:   body.raffle.id,
      raffleName: body.raffle.name,
      ...body.metadata,
    },
  };

  const res = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GATEWAY_API_KEY}`,
    },
    body: JSON.stringify(gatewayPayload),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? 'Error en Gateway de facturación' },
      { status: 502 }
    );
  }

  // Respuesta en el formato exacto que espera el invoicing-connector.ts
  return NextResponse.json({
    invoiceNumber: data.invoice_number ?? '',
    cae:           data.cae ?? '',
    caeDueDate:    data.cae_due_date ?? null,
    pdfBase64:     data.pdf_base64 ?? null,
    rawResponse:   data,
  });
}

function mapDocType(docType: string): string {
  const map: Record<string, string> = {
    DNI:       'DNI',
    CUIT:      'CUIT',
    CUIL:      'CUIL',
    CDI:       'CDI',
    PASAPORTE: 'PASAPORTE',
  };
  return map[docType?.toUpperCase()] ?? 'CONSUMIDOR_FINAL';
}
