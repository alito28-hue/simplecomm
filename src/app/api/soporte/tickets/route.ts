import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase.from('support_tickets').select('*')
    .eq('userId', user.id).order('createdAt', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const now = new Date().toISOString();
  const ticketId = randomUUID();

  const { data, error } = await supabase.from('support_tickets').insert({
    id: ticketId,
    organizationId: user.id,
    userId: user.id,
    subject: body.subject,
    status: 'open',
    priority: body.priority ?? 'normal',
    category: body.category ?? 'general',
    createdAt: now,
    updatedAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Guardar el primer mensaje
  if (body.message) {
    await supabase.from('ticket_messages').insert({
      id: randomUUID(), ticketId, userId: user.id, isAdmin: false, message: body.message, createdAt: now,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
