import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'https://simplecomm-production.up.railway.app';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';

export async function POST(req: NextRequest) {
  // Verificar auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { amount, description, docNumber, sendEmail } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const idempotencyKey = `${user.id}:${randomUUID()}`;

  const body = {
    idempotency_key: idempotencyKey,
    invoice: {
      total_amount: amount,
      concept: 1,
      description: description || 'Venta',
    },
    buyer: {
      full_name: 'Consumidor Final',
      doc_type: docNumber ? 'DNI' : 'CONSUMIDOR_FINAL',
      doc_number: docNumber || '0',
    },
    source_app: 'simplecomm',
  };

  const res = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Gateway error' }, { status: 502 });
  }

  return NextResponse.json({
    invoiceNumber: data.invoice_number,
    cae: data.cae,
    caeDueDate: data.cae_due_date,
    pdfBase64: data.pdf_base64,
    status: data.status,
  });
}
