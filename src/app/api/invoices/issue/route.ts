import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    amount,
    description,
    docNumber,
    docType,
    buyerName,
    concept,
    invoiceLetter = 'B',  // 'A' | 'B' | 'C'
    ivaRate = 21,          // 21, 10.5, 27, 0
    buyerCuit,
  } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
  }

  // Para Factura A, el receptor debe ser CUIT
  const finalDocType = invoiceLetter === 'A'
    ? 'CUIT'
    : (docType ?? (docNumber ? 'DNI' : 'CONSUMIDOR_FINAL'));

  const finalDocNumber = invoiceLetter === 'A'
    ? (buyerCuit || docNumber || '0')
    : (docNumber || '0');

  const idempotencyKey = `${user.id}:${randomUUID()}`;

  const body = {
    idempotency_key: idempotencyKey,
    invoice: {
      total_amount: amount,
      invoice_letter: invoiceLetter,
      iva_rate: ivaRate,
      concept: concept ?? 1,
      description: description ?? 'Venta',
    },
    buyer: {
      full_name:   buyerName ?? 'Consumidor Final',
      doc_type:    finalDocType,
      doc_number:  finalDocNumber,
    },
    source_app: 'simplecomm',
  };

  const gatewayApiKey = await getGatewayKey(user.id);
  const res = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gatewayApiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Gateway error' }, { status: 502 });
  }

  return NextResponse.json({
    invoiceNumber: data.invoice_number,
    cae:           data.cae,
    caeDueDate:    data.cae_due_date,
    pdfBase64:     data.pdf_base64,
    status:        data.status,
  });
}
