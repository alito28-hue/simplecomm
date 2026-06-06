import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { randomUUID } from 'crypto';

const NOTA_CREDITO_MAP: Record<number, number> = {
  1: 3,   // Factura A → NC-A
  6: 8,   // Factura B → NC-B
  11: 13, // Factura C → NC-C
};

function tipoLetraToCode(invoiceLetter: string | null | undefined): number {
  switch (invoiceLetter?.toUpperCase()) {
    case 'A': return 1;
    case 'B': return 6;
    case 'C': return 11;
    default:  return 6;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { originalInvoiceId } = await req.json();
  if (!originalInvoiceId) {
    return NextResponse.json({ error: 'originalInvoiceId requerido' }, { status: 400 });
  }

  const apiKey = await getGatewayKey(user.id);

  const origRes = await fetch(`${GATEWAY_URL}/v1/invoices/${originalInvoiceId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!origRes.ok) {
    return NextResponse.json({ error: 'Factura original no encontrada' }, { status: 404 });
  }

  const orig = await origRes.json();

  const tipoOriginal = orig.invoice_type_code ?? tipoLetraToCode(orig.invoice_letter);
  const tipoNC = NOTA_CREDITO_MAP[tipoOriginal] ?? 8;

  const idempotencyKey = `nc:${user.id}:${originalInvoiceId}:${randomUUID()}`;

  const body = {
    idempotency_key: idempotencyKey,
    invoice: {
      total_amount:       orig.total_amount,
      invoice_type_code:  tipoNC,
      invoice_letter:     orig.invoice_letter ?? 'B',
      iva_rate:           orig.iva_rate ?? 21,
      concept:            orig.concept ?? 1,
      description:        `Nota de crédito — ${orig.invoice_number ?? originalInvoiceId}`,
    },
    buyer: {
      full_name:  orig.buyer_name ?? 'Consumidor Final',
      doc_type:   orig.buyer_doc_type ?? 'DNI',
      doc_number: orig.buyer_doc_number ?? '0',
    },
    source_app:      'simplecomm',
    original_invoice: originalInvoiceId,
  };

  const ncRes = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  const ncData = await ncRes.json();

  if (!ncRes.ok) {
    return NextResponse.json({ error: ncData.error ?? 'Gateway error' }, { status: 502 });
  }

  return NextResponse.json({
    invoiceNumber: ncData.invoice_number,
    cae:           ncData.cae,
    status:        ncData.status,
  });
}
