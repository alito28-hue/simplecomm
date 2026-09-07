import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const TIPO_IMPUESTO = ['GANANCIAS', 'IVA', 'IIBB', 'SIN_CLASIFICAR'] as const;
const ORIGEN = ['COMPROBANTE_RETENCION', 'INFERIDO_BANCO', 'MANUAL'] as const;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get('invoiceId');

  let query = supabase.from('retenciones_percepciones').select('*').eq('organizationId', user.id);
  if (invoiceId) query = query.eq('invoiceId', invoiceId);
  query = query.order('fecha', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const monto = Number(form.get('monto'));
  const tipoImpuestoRaw = form.get('tipoImpuesto') as string | null;
  const origenRaw = form.get('origen') as string | null;
  const tipoImpuesto = TIPO_IMPUESTO.includes(tipoImpuestoRaw as typeof TIPO_IMPUESTO[number]) ? tipoImpuestoRaw : 'SIN_CLASIFICAR';
  const origen = ORIGEN.includes(origenRaw as typeof ORIGEN[number]) ? origenRaw : 'MANUAL';
  const fecha = (form.get('fecha') as string | null) || new Date().toISOString().slice(0, 10);
  const invoiceId = (form.get('invoiceId') as string | null) || null;
  const codigoImpuestoAFIP = form.get('codigoImpuestoAFIP');
  const codigoRegimenAFIP = form.get('codigoRegimenAFIP');
  const cuitAgenteRetencion = (form.get('cuitAgenteRetencion') as string | null) || null;
  const alicuota = form.get('alicuota');
  const importeOperacionBase = form.get('importeOperacionBase');

  if (!monto || monto <= 0) {
    return NextResponse.json({ error: 'El monto debe ser mayor a cero' }, { status: 400 });
  }

  let fileUrl: string | null = null;
  if (file) {
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el límite de 10MB' }, { status: 400 });
    }
    const path = `${user.id}/retenciones/${randomUUID()}-${file.name}`;
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage.from('attachments')
      .upload(path, bytes, { contentType: file.type || 'application/octet-stream' });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    fileUrl = path;
  }

  const { data, error } = await supabase.from('retenciones_percepciones').insert({
    organizationId: user.id,
    monto,
    tipoImpuesto,
    origen,
    fecha,
    invoiceId,
    codigoImpuestoAFIP: codigoImpuestoAFIP != null && codigoImpuestoAFIP !== '' ? Number(codigoImpuestoAFIP) : null,
    codigoRegimenAFIP: codigoRegimenAFIP != null && codigoRegimenAFIP !== '' ? Number(codigoRegimenAFIP) : null,
    cuitAgenteRetencion,
    alicuota: alicuota != null && alicuota !== '' ? Number(alicuota) : null,
    importeOperacionBase: importeOperacionBase != null && importeOperacionBase !== '' ? Number(importeOperacionBase) : null,
    fileUrl,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
