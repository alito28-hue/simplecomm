import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cotizarEnvio, type Paquete } from '@/lib/enviopack';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { provinciaId, codigoPostal, localidadId, paquetes } = body as {
    provinciaId?: string; codigoPostal?: string; localidadId?: string; paquetes?: Paquete[];
  };

  if (!provinciaId || !codigoPostal || !paquetes?.length) {
    return NextResponse.json({ error: 'Faltan provincia, código postal o paquetes' }, { status: 400 });
  }

  try {
    const result = await cotizarEnvio(supabase, user.id, { provinciaId, codigoPostal, localidadId, paquetes });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al cotizar' }, { status: 502 });
  }
}
