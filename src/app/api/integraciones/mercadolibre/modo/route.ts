import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_MODES = new Set(['AUTOMATIC', 'CONFIRMATION', 'PAUSED']);

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { mode } = await req.json();
  if (!VALID_MODES.has(mode)) return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 });

  // Cliente admin: evita depender de políticas RLS de "integrations" que podían dejar el
  // update sin efecto silenciosamente (0 filas afectadas, sin error) — el scoping por
  // organizationId ya lo garantiza el filtro de abajo, usando el user autenticado arriba.
  const admin = createAdminClient();
  const { data, error } = await admin.from('integrations')
    .update({ mode, updatedAt: new Date().toISOString() })
    .eq('organizationId', user.id).eq('platform', 'MERCADO_LIBRE')
    .select('mode');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No se encontró la integración de Mercado Libre para esta cuenta' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, mode: data[0].mode });
}
