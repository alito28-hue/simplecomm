import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface MpPayer {
  email?: string;
  first_name?: string;
  last_name?: string;
  identification?: { type?: string; number?: string | number };
}

interface MpPayment {
  id: number;
  transaction_amount: number;
  description?: string;
  date_approved?: string;
  date_created?: string;
  payment_method_id?: string;
  payer?: MpPayer;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase
    .from('integrations')
    .select('accessToken')
    .eq('organizationId', user.id)
    .eq('platform', 'MERCADO_PAGO')
    .eq('status', 'CONNECTED')
    .single();

  if (!integration?.accessToken) {
    return NextResponse.json({ error: 'Mercado Pago no conectado' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultBegin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultEnd = now.toISOString();
  const beginDate = searchParams.get('from') ?? defaultBegin;
  const endDate = searchParams.get('to') ?? defaultEnd;

  const url = new URL('https://api.mercadopago.com/v1/payments/search');
  url.searchParams.set('begin_date', beginDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('status', 'approved');
  url.searchParams.set('sort', 'date_created');
  url.searchParams.set('criteria', 'desc');
  url.searchParams.set('limit', '100');

  const mpRes = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${integration.accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!mpRes.ok) {
    const err = await mpRes.text();
    console.error('[cobranzas/mp] MP error:', err);
    return NextResponse.json({ error: `Error Mercado Pago: ${mpRes.status}` }, { status: 502 });
  }

  const mpData = await mpRes.json();
  const payments: MpPayment[] = mpData.results ?? [];

  const paymentIds = payments.map(p => String(p.id));
  const { data: invoiced } = paymentIds.length > 0
    ? await supabase
        .from('mp_payment_invoices')
        .select('paymentId, invoiceNumber, cae')
        .eq('organizationId', user.id)
        .in('paymentId', paymentIds)
    : { data: [] };

  const invoicedMap = new Map((invoiced ?? []).map((r: { paymentId: string; invoiceNumber?: string; cae?: string }) => [r.paymentId, r]));

  const result = payments.map(p => {
    const inv = invoicedMap.get(String(p.id));
    const payerName = [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(' ')
      || p.payer?.email
      || 'Desconocido';
    return {
      id: String(p.id),
      amount: p.transaction_amount,
      date: p.date_approved ?? p.date_created,
      description: p.description ?? '',
      payerEmail: p.payer?.email ?? '',
      payerName,
      payerDocType: p.payer?.identification?.type ?? '',
      payerDocNumber: p.payer?.identification?.number ? String(p.payer.identification.number) : '',
      paymentMethod: p.payment_method_id ?? '',
      invoiced: !!inv,
      invoiceNumber: inv?.invoiceNumber ?? null,
    };
  });

  return NextResponse.json({ payments: result, total: mpData.paging?.total ?? payments.length });
}
