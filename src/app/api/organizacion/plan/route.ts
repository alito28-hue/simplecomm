import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/usage';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId } = await req.json();
  if (!planId || !(planId in PLANS)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  const { error } = await supabase.from('organizations')
    .update({ planId, subscriptionStatus: 'ACTIVE', updatedAt: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, planId });
}
