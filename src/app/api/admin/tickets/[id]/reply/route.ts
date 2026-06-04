import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alito28@gmail.com';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });

  const now = new Date().toISOString();
  await supabase.from('ticket_messages').insert({
    id: randomUUID(), ticketId: id, userId: user.id, isAdmin: true, message, createdAt: now,
  });

  // Cambiar estado a in_progress si estaba abierto
  await supabase.from('support_tickets').update({ status: 'in_progress', updatedAt: now })
    .eq('id', id).eq('status', 'open');

  return NextResponse.json({ success: true });
}
