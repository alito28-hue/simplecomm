import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('organizationId', user.id)
    .order('createdAt', { ascending: false })
    .limit(20);

  return NextResponse.json(data ?? []);
}
