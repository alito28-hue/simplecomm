import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgUsage } from '@/lib/usage';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [usage, { data: payments }] = await Promise.all([
    getOrgUsage(user.id),
    supabase.from('subscription_payments')
      .select('*')
      .eq('organizationId', user.id)
      .order('createdAt', { ascending: false })
      .limit(12),
  ]);

  return NextResponse.json({ usage, payments: payments ?? [] });
}
