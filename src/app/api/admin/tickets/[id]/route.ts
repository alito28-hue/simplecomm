import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase.from('support_tickets').select('*').eq('id', id).single(),
    supabase.from('ticket_messages').select('*').eq('ticketId', id).order('createdAt'),
  ]);

  return NextResponse.json({ ticket, messages: messages ?? [] });
}
