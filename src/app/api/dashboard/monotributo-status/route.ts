import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeMonotributoStatus } from '@/lib/monotributo';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = await computeMonotributoStatus(supabase, user.id);
  return NextResponse.json(status);
}
