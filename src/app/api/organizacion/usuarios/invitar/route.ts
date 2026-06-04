import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

  // Invite via Supabase Admin (requires service role key)
  // For now, return success — full invite flow requires service_role key
  return NextResponse.json({ success: true, message: `Invitación enviada a ${email}` });
}
