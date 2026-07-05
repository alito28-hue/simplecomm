import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseArcaEmitidosCSV } from '@/lib/parsers/arca';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

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
  // El export de "Mis Comprobantes" de ARCA viene en UTF-8 (verificado con un archivo real
  // — lo que parecía Windows-1252 en las pruebas anteriores era en realidad UTF-8 mal
  // decodificado en la vista previa, no el archivo real).
  const text = new TextDecoder('utf-8').decode(bytes);
  const rows = parseArcaEmitidosCSV(text);
  if (!rows.length) {
    return NextResponse.json(
      { error: 'No se encontraron comprobantes válidos. Verificá que sea el CSV de "Mis Comprobantes" emitidos exportado desde ARCA.' },
      { status: 400 },
    );
  }

  const { count: countBefore } = await supabase
    .from('arca_sales_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organizationId', user.id);

  const { error } = await supabase.from('arca_sales_invoices').upsert(
    rows.map(r => ({
      organizationId: user.id,
      tipoComprobante: r.tipoComprobante,
      puntoVenta: r.puntoVenta,
      numeroComprobante: r.numeroComprobante,
      numeroHasta: r.numeroHasta,
      issueDate: r.issueDate,
      receptorCuit: r.receptorCuit,
      receptorNombre: r.receptorNombre,
      netAmount: r.netAmount,
      ivaAmount: r.ivaAmount,
      totalAmount: r.totalAmount,
      cae: r.cae,
      raw: r,
    })),
    { onConflict: 'organizationId,tipoComprobante,puntoVenta,numeroComprobante' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count: countAfter } = await supabase
    .from('arca_sales_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organizationId', user.id);

  const newCount = Math.max(0, (countAfter ?? 0) - (countBefore ?? 0));
  const updatedCount = rows.length - newCount;

  const { data: log } = await supabase.from('arca_import_log').insert({
    organizationId: user.id,
    importType: 'emitidos',
    rowCount: rows.length,
    newCount,
    updatedCount,
  }).select().single();

  return NextResponse.json({ rowCount: rows.length, newCount, updatedCount, importedAt: log?.importedAt });
}
