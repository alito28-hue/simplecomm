import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    paymentId: string;
    invoiceNumber?: string;
    cae?: string;
    amount?: number;
    payerName?: string;
    payerEmail?: string;
    payerDocType?: string;
    payerDocNumber?: string;
  };

  if (!body.paymentId) {
    return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 });
  }

  const { error } = await supabase.from('mp_payment_invoices').upsert({
    organizationId: user.id,
    paymentId: body.paymentId,
    invoiceNumber: body.invoiceNumber ?? null,
    cae: body.cae ?? null,
    amount: body.amount ?? null,
    payerName: body.payerName ?? null,
    payerEmail: body.payerEmail ?? null,
    payerDocType: body.payerDocType ?? null,
    payerDocNumber: body.payerDocNumber ?? null,
    createdAt: new Date().toISOString(),
  }, { onConflict: 'organizationId,paymentId' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
