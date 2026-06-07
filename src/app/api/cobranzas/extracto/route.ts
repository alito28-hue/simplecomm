import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseGaliciaCSV } from '@/lib/parsers/galicia';
import { parseSantanderPDF } from '@/lib/parsers/santander';
import { BankTransaction, transactionRef } from '@/lib/parsers/types';

async function withDuplicateFlags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  bank: string,
  transactions: BankTransaction[],
) {
  if (transactions.length === 0) return [];

  const refs = transactions.map(transactionRef);
  const { data: existing } = await supabase
    .from('bank_transaction_invoices')
    .select('operationRef, invoiceNumber')
    .eq('organizationId', organizationId)
    .eq('bank', bank)
    .in('operationRef', refs);

  const existingMap = new Map(
    (existing ?? []).map((r: { operationRef: string; invoiceNumber: string | null }) => [r.operationRef, r.invoiceNumber])
  );

  return transactions.map(t => {
    const ref = transactionRef(t);
    return {
      ...t,
      operationRef: ref,
      alreadyInvoiced: existingMap.has(ref),
      invoiceNumber: existingMap.get(ref) ?? null,
    };
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const bank = form.get('bank') as string | null;

  if (!file || !bank) {
    return NextResponse.json({ error: 'Archivo y banco requeridos' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx 5MB)' }, { status: 400 });
  }

  try {
    if (bank === 'galicia') {
      const buffer = await file.arrayBuffer();
      // Try UTF-8 first (Galicia files have BOM + UTF-8 content)
      const text = new TextDecoder('utf-8').decode(buffer);
      const transactions = await withDuplicateFlags(supabase, user.id, bank, parseGaliciaCSV(text));
      return NextResponse.json({ transactions });
    }

    if (bank === 'santander') {
      const buffer = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      const transactions = await withDuplicateFlags(supabase, user.id, bank, parseSantanderPDF(result.text));
      return NextResponse.json({ transactions });
    }

    return NextResponse.json({ error: 'Banco no soportado' }, { status: 400 });
  } catch (err) {
    console.error('[extracto] parse error:', err);
    return NextResponse.json({ error: 'No se pudo parsear el archivo' }, { status: 500 });
  }
}
