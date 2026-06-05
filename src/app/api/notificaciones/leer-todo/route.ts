import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('notifications')
    .update({ isRead: true })
    .eq('organizationId', user.id)
    .eq('isRead', false);

  return NextResponse.json({ ok: true });
}
