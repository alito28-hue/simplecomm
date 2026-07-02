import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from'); // YYYY-MM-DD
  const to = searchParams.get('to');     // YYYY-MM-DD

  let query = supabase.from('purchase_invoices').select('*').eq('organizationId', user.id);
  if (from) query = query.gte('issueDate', from);
  if (to) query = query.lte('issueDate', to);
  query = query.order('issueDate', { ascending: false, nullsFirst: false }).order('createdAt', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all((data ?? []).map(async (p) => {
    let signedUrl: string | null = null;
    if (p.fileUrl) {
      const { data: signed } = await supabase.storage.from('attachments').createSignedUrl(p.fileUrl, 60 * 10);
      signedUrl = signed?.signedUrl ?? null;
    }
    return { ...p, signedUrl };
  }));

  const totals = (data ?? []).reduce((acc, p) => ({
    net: acc.net + Number(p.netAmount ?? 0),
    iva: acc.iva + Number(p.ivaAmount ?? 0),
    total: acc.total + Number(p.totalAmount ?? 0),
  }), { net: 0, iva: 0, total: 0 });

  return NextResponse.json({ data: withUrls, totals });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const issuerName = (form.get('issuerName') as string | null) ?? '';
  const issuerCuit = (form.get('issuerCuit') as string | null) ?? '';
  const invoiceLetter = (form.get('invoiceLetter') as string | null) ?? '';
  const invoiceNumber = (form.get('invoiceNumber') as string | null) ?? '';
  const issueDate = (form.get('issueDate') as string | null) || null;
  const netAmount = parseFloat((form.get('netAmount') as string | null) ?? '0');
  const ivaAmount = parseFloat((form.get('ivaAmount') as string | null) ?? '0');
  const totalAmount = parseFloat((form.get('totalAmount') as string | null) ?? '0');
  const source = (form.get('source') as string | null) ?? 'manual';
  const extractedRawStr = form.get('extractedRaw') as string | null;

  if (!totalAmount || totalAmount <= 0) {
    return NextResponse.json({ error: 'El monto total debe ser mayor a cero' }, { status: 400 });
  }

  let fileUrl: string | null = null;
  if (file) {
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el límite de 10MB' }, { status: 400 });
    }
    const path = `${user.id}/compras/${randomUUID()}-${file.name}`;
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage.from('attachments')
      .upload(path, bytes, { contentType: file.type || 'application/octet-stream' });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    fileUrl = path;
  }

  let extractedRaw: unknown = null;
  if (extractedRawStr) {
    try { extractedRaw = JSON.parse(extractedRawStr); } catch { extractedRaw = null; }
  }

  const { data, error } = await supabase.from('purchase_invoices').insert({
    id: randomUUID(),
    organizationId: user.id,
    issuerName,
    issuerCuit,
    invoiceLetter,
    invoiceNumber,
    issueDate,
    netAmount,
    ivaAmount,
    totalAmount,
    source,
    fileUrl,
    extractedRaw,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
