import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ invoices: [], contacts: [] });
  }

  const apiKey = await getGatewayKey(user.id);

  const [contactsRes, invoicesRes] = await Promise.all([
    supabase.from('clients')
      .select('id, businessName, docType, docNumber')
      .eq('organizationId', user.id)
      .or(`businessName.ilike.%${q}%,docNumber.ilike.%${q}%`)
      .limit(10),
    fetch(`${GATEWAY_URL}/v1/invoices?q=${encodeURIComponent(q)}&limit=20`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null),
  ]);

  let invoices: unknown[] = [];
  if (invoicesRes && invoicesRes.ok) {
    const data = await invoicesRes.json();
    const all: Array<{ buyer_name?: string; invoice_number?: string; [k: string]: unknown }> = data.data ?? [];
    const qLower = q.toLowerCase();
    invoices = all.filter(inv =>
      inv.buyer_name?.toLowerCase().includes(qLower) ||
      inv.invoice_number?.toLowerCase().includes(qLower)
    ).slice(0, 20);
  }

  return NextResponse.json({
    invoices,
    contacts: contactsRes.data ?? [],
  });
}
