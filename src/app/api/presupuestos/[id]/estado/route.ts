import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = new Set(['PENDIENTE', 'ACEPTADO', 'RECHAZADO']);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status } = await req.json();
  if (!VALID_STATUSES.has(status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  const { data, error } = await supabase.from('quotes')
    .update({ status, updatedAt: new Date().toISOString() })
    .eq('id', id).eq('organizationId', user.id).eq('status', 'PENDIENTE').select().maybeSingle();
  // Solo se puede cambiar de estado desde PENDIENTE — evita marcar aceptado/rechazado algo
  // que ya se convirtió en factura.

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'El presupuesto ya no está pendiente' }, { status: 409 });
  return NextResponse.json(data);
}
