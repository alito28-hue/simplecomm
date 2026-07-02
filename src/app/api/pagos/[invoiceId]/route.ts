import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status, invoiceNumber, paidAmount } = await req.json();
  if (!['PENDING', 'PAID'].includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase.from('invoice_payments').upsert({
    organizationId: user.id,
    invoiceId,
    invoiceNumber: invoiceNumber ?? null,
    status,
    paidAt: status === 'PAID' ? now : null,
    paidAmount: status === 'PAID' ? (paidAmount ?? null) : null,
    source: 'manual',
    updatedAt: now,
  }, { onConflict: 'organizationId,invoiceId' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
