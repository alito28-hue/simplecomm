import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: schedule, error }, { data: occurrences }] = await Promise.all([
    supabase.from('scheduled_invoices').select('*').eq('id', id).eq('organizationId', user.id).single(),
    supabase.from('scheduled_invoice_occurrences').select('*').eq('scheduledInvoiceId', id)
      .eq('organizationId', user.id).order('month', { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: 'Programación no encontrada' }, { status: 404 });
  return NextResponse.json({ schedule, occurrences: occurrences ?? [] });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const allowed = ['buyerName', 'docType', 'docNumber', 'description', 'amount', 'invoiceLetter', 'ivaRate', 'concept', 'recipientEmail', 'mode', 'endType', 'endValue'];
  const changes = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  changes.updatedAt = new Date().toISOString();
  const { data, error } = await supabase.from('scheduled_invoices').update(changes)
    .eq('id', id).eq('organizationId', user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

