import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { checkAndIncrementUsage } from '@/lib/usage';
import { translateGatewayError } from '@/lib/afip-errors';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: pending } = await supabase.from('pending_platform_invoices')
    .select('*').eq('id', id).eq('organizationId', user.id).eq('status', 'PENDING').maybeSingle();
  if (!pending) return NextResponse.json({ error: 'No encontrada o ya resuelta' }, { status: 404 });

  const usageCheck = await checkAndIncrementUsage(user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.reason, limitReached: true }, { status: 402 });
  }

  const idempotencyKey = `${pending.platform}:pending:${pending.id}`;
  const gatewayApiKey = await getGatewayKey(user.id);
  const gatewayRes = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gatewayApiKey}` },
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      invoice: {
        total_amount: Number(pending.amount),
        invoice_letter: pending.invoiceLetter,
        concept: 1,
        description: pending.description ?? undefined,
      },
      buyer: {
        full_name: pending.buyerName,
        doc_type: pending.buyerDocType,
        doc_number: pending.buyerDocNumber,
        email: pending.buyerEmail ?? undefined,
      },
      source_app: pending.platform,
      external_ref: pending.externalRef,
      metadata: pending.metadata ?? undefined,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const invoiceData = await gatewayRes.json();
  if (!gatewayRes.ok) {
    // La dejamos en PENDING — el usuario puede corregir algo (ej. el plan) y reintentar.
    return NextResponse.json({ error: translateGatewayError(invoiceData.error) }, { status: 502 });
  }

  await supabase.from('pending_platform_invoices')
    .update({ status: 'APPROVED', resolvedAt: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({
    invoiceNumber: invoiceData.invoice_number,
    cae: invoiceData.cae,
    status: invoiceData.status,
  });
}
