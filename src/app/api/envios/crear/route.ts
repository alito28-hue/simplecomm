import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { crearEnvio, type CrearEnvioParams } from '@/lib/enviopack';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { clientId, invoiceExternalRef, ...params } = body as CrearEnvioParams & {
    clientId?: string; invoiceExternalRef?: string;
  };

  if (!params.destinatario || !params.paquetes?.length || !params.correoId) {
    return NextResponse.json({ error: 'Faltan datos del destinatario, paquetes o correo' }, { status: 400 });
  }

  try {
    const envio = await crearEnvio(supabase, user.id, params);

    await supabase.from('shipments').insert({
      organizationId: user.id,
      invoiceExternalRef: invoiceExternalRef || null,
      clientId: clientId || null,
      enviopackEnvioId: envio.envioId,
      trackingNumber: envio.trackingNumber,
      estado: envio.estado,
      costoEnvio: envio.costoEnvio,
    });

    return NextResponse.json(envio, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al crear el envío' }, { status: 502 });
  }
}
