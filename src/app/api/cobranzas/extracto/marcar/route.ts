import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    bank: string;
    operationRef: string;
    transactionDate?: string;
    amount?: number;
    payerName?: string;
    payerCuit?: string;
    invoiceNumber?: string;
    cae?: string;
  };

  if (!body.bank || !body.operationRef) {
    return NextResponse.json({ error: 'bank y operationRef requeridos' }, { status: 400 });
  }

  const { error } = await supabase.from('bank_transaction_invoices').upsert({
    organizationId: user.id,
    bank: body.bank,
    operationRef: body.operationRef,
    transactionDate: body.transactionDate ?? null,
    amount: body.amount ?? null,
    payerName: body.payerName ?? null,
    payerCuit: body.payerCuit ?? null,
    invoiceNumber: body.invoiceNumber ?? null,
    cae: body.cae ?? null,
    createdAt: new Date().toISOString(),
  }, { onConflict: 'organizationId,bank,operationRef' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
