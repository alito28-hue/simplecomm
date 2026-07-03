import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { obtenerEtiquetaUrl } from '@/lib/enviopack';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: shipment } = await supabase.from('shipments')
    .select('enviopackEnvioId').eq('id', id).eq('organizationId', user.id).maybeSingle();
  if (!shipment) return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });

  try {
    const url = await obtenerEtiquetaUrl(supabase, user.id, shipment.enviopackEnvioId);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al obtener la etiqueta' }, { status: 502 });
  }
}
