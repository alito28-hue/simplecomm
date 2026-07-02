import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Dueño de la organización: su propio auth id ES el id de la organización → ADMIN implícito.
  const { data: org } = await supabase.from('organizations').select('id').eq('id', user.id).maybeSingle();
  if (org) {
    return NextResponse.json({ role: 'ADMIN', permissions: [] as string[], isOwner: true });
  }

  // Usuario invitado: buscar su fila en "users" por supabaseId.
  const { data: teamUser } = await supabase.from('users')
    .select('role, permissions').eq('supabaseId', user.id).maybeSingle();

  return NextResponse.json({
    role: teamUser?.role ?? 'OPERATOR',
    permissions: teamUser?.permissions ?? [],
    isOwner: false,
  });
}
