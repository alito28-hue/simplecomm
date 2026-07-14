import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComprobantesUnificados } from '@/lib/facturas';

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

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? '20'));

  // Fuente unificada (Gateway + importado de ARCA) — antes solo se consultaba al Gateway, así
  // que un cliente que solo tuviera comprobantes importados de ARCA (nunca facturado vía
  // SimpleComm) aparecía sin historial, aunque sí tuviera comprobantes reales por ese CUIT.
  const all = await getComprobantesUnificados(supabase, user.id);
  const cleanDoc = client.docNumber ? client.docNumber.replace(/\D/g, '') : '';
  const matching = cleanDoc && cleanDoc !== '0'
    ? all.filter(c => c.buyer_doc === cleanDoc)
    : [];

  const total = matching.length;
  const start = (page - 1) * limit;
  const invoices = matching.slice(start, start + limit);

  return NextResponse.json({
    invoices,
    clientName: client.businessName,
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
}
