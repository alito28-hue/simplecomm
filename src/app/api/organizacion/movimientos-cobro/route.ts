import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TIPO = ['PERCEPCION_IIBB_BANCO', 'LEY25413_CREDITO', 'LEY25413_DEBITO', 'COMISION_FINANCIERA', 'OTRO_SIN_CLASIFICAR'] as const;
const ORIGEN = ['COMPROBANTE', 'EXTRACTO_BANCARIO', 'MANUAL'] as const;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get('invoiceId');

  let query = supabase.from('movimientos_cobro').select('*').eq('organizationId', user.id);
  if (invoiceId) query = query.eq('invoiceId', invoiceId);
  query = query.order('fechaCobro', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const monto = Number(body.monto);
  const tipo = TIPO.includes(body.tipo) ? body.tipo : 'OTRO_SIN_CLASIFICAR';
  const origen = ORIGEN.includes(body.origen) ? body.origen : 'MANUAL';
  const fechaCobro = body.fechaCobro || new Date().toISOString().slice(0, 10);
  const invoiceId = body.invoiceId as string | undefined;

  if (!monto || monto <= 0) {
    return NextResponse.json({ error: 'El monto debe ser mayor a cero' }, { status: 400 });
  }
  if (!invoiceId) {
    return NextResponse.json({ error: 'invoiceId es obligatorio' }, { status: 400 });
  }

  const { data, error } = await supabase.from('movimientos_cobro').insert({
    organizationId: user.id,
    invoiceId,
    fechaCobro,
    tipo,
    monto,
    jurisdiccionIIBB: body.jurisdiccionIIBB || null,
    alicuota: body.alicuota ?? null,
    origen,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
