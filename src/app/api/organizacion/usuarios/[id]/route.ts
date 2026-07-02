import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PERMISSIONS } from '@/lib/permissions';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Solo el dueño de la organización (su auth id == organizations.id) puede editar roles/permisos.
  const { data: org } = await supabase.from('organizations').select('id').eq('id', user.id).maybeSingle();
  if (!org) return NextResponse.json({ error: 'Solo el administrador puede editar usuarios' }, { status: 403 });

  const { role, permissions } = await req.json();
  if (!['ADMIN', 'OPERATOR'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }
  const validKeys = new Set(PERMISSIONS.map(p => p.key));
  const cleanPermissions = Array.isArray(permissions) ? permissions.filter(p => validKeys.has(p)) : [];

  const { data, error } = await supabase.from('users')
    .update({ role, permissions: cleanPermissions, updatedAt: new Date().toISOString() })
    .eq('id', id).eq('organizationId', user.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
