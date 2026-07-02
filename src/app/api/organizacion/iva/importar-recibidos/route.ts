import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseArcaRecibidosCSV } from '@/lib/parsers/arca';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Códigos de comprobante AFIP → letra, para mostrar en la tabla de compras.
const TIPO_TO_LETTER: Record<number, string> = {
  1: 'A', 2: 'A', 3: 'A', 201: 'A', 202: 'A', 203: 'A',
  6: 'B', 7: 'B', 8: 'B', 206: 'B', 207: 'B', 208: 'B',
  11: 'C', 12: 'C', 13: 'C', 211: 'C', 212: 'C', 213: 'C',
  51: 'M', 52: 'M', 53: 'M',
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file requerido' }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 5MB' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const text = new TextDecoder('windows-1252').decode(bytes);
  const parsed = parseArcaRecibidosCSV(text);
  if (!parsed.length) {
    return NextResponse.json(
      { error: 'No se encontraron comprobantes válidos. Verificá que sea el CSV de "Mis Comprobantes" recibidos exportado desde ARCA.' },
      { status: 400 },
    );
  }

  // El monto total debe ser > 0 (constraint de la tabla); se descartan filas sin importe.
  const rows = parsed.filter(r => r.totalAmount > 0);
  const skippedCount = parsed.length - rows.length;
  if (!rows.length) {
    return NextResponse.json({ error: 'Ninguna fila tiene un monto total válido.' }, { status: 400 });
  }

  const { count: countBefore } = await supabase
    .from('purchase_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organizationId', user.id)
    .eq('source', 'arca_import');

  const { error } = await supabase.from('purchase_invoices').upsert(
    rows.map(r => ({
      organizationId: user.id,
      issuerName: r.issuerName,
      issuerCuit: r.issuerCuit,
      invoiceLetter: TIPO_TO_LETTER[r.tipoComprobante] ?? 'OTRO',
      invoiceNumber: String(r.numeroComprobante),
      puntoVenta: r.puntoVenta,
      tipoComprobante: r.tipoComprobante,
      issueDate: r.issueDate,
      netAmount: r.netAmount,
      ivaAmount: r.ivaAmount,
      totalAmount: r.totalAmount,
      source: 'arca_import',
      extractedRaw: r,
    })),
    { onConflict: 'organizationId,issuerCuit,tipoComprobante,puntoVenta,invoiceNumber' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count: countAfter } = await supabase
    .from('purchase_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organizationId', user.id)
    .eq('source', 'arca_import');

  const newCount = Math.max(0, (countAfter ?? 0) - (countBefore ?? 0));
  const updatedCount = rows.length - newCount;

  const { data: log } = await supabase.from('arca_import_log').insert({
    organizationId: user.id,
    importType: 'recibidos',
    rowCount: rows.length,
    newCount,
    updatedCount,
  }).select().single();

  return NextResponse.json({ rowCount: rows.length, newCount, updatedCount, skippedCount, importedAt: log?.importedAt });
}
