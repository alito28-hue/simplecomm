import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/usage';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';

// Solo admin puede cambiar planes sin pagar (para casos de soporte/prueba)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { planId, organizationId } = await req.json();
  if (!planId || !(planId in PLANS)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  const orgId = organizationId ?? user.id;
  const { error } = await supabase.from('organizations')
    .update({ planId, subscriptionStatus: 'ACTIVE', updatedAt: new Date().toISOString() })
    .eq('id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, planId });
}
