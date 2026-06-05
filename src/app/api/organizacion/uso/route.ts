import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgUsage } from '@/lib/usage';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const usage = await getOrgUsage(user.id);
  if (!usage) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });

  return NextResponse.json(usage);
}
