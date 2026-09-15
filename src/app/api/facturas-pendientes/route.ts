import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Cliente admin: mismo motivo que en integraciones/*/modo — evita depender de políticas RLS
  // de esta tabla nueva que podían dejar el select sin resultados en silencio.
  const admin = createAdminClient();
  const { data, error } = await admin.from('pending_platform_invoices')
    .select('*').eq('organizationId', user.id).eq('status', 'PENDING').order('createdAt', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
