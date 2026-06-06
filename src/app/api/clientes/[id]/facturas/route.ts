import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: client } = await supabase
    .from('clients')
    .select('docNumber, businessName')
    .eq('id', id)
    .eq('organizationId', user.id)
    .maybeSingle();

  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

  const apiKey = await getGatewayKey(user.id);

  const params2 = new URLSearchParams({ limit: '100' });
  if (client.docNumber && client.docNumber !== '0') {
    params2.set('buyer_doc', client.docNumber);
  }

  const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params2}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    return NextResponse.json({ invoices: [], clientName: client.businessName });
  }

  const data = await res.json();
  const allInvoices: Array<{ buyer_doc_number?: string | null; [key: string]: unknown }> = data.data ?? [];

  const filtered = client.docNumber && client.docNumber !== '0'
    ? allInvoices.filter(inv => inv.buyer_doc_number === client.docNumber)
    : allInvoices;

  return NextResponse.json({
    invoices: filtered,
    clientName: client.businessName,
  });
}
