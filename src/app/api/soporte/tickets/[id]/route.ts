import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase.from('support_tickets').select('*').eq('id', id).eq('userId', user.id).single(),
    supabase.from('ticket_messages').select('*').eq('ticketId', id).order('createdAt'),
  ]);

  if (!ticket) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ ticket, messages: messages ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message } = await req.json();
  const now = new Date().toISOString();
  await supabase.from('ticket_messages').insert({
    id: randomUUID(), ticketId: id, userId: user.id, isAdmin: false, message, createdAt: now,
  });
  await supabase.from('support_tickets').update({ status: 'open', updatedAt: now }).eq('id', id);
  return NextResponse.json({ success: true });
}
