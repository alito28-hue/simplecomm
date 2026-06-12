import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { issueScheduledOccurrence } from '@/lib/scheduled-invoices/issue';

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: occurrence } = await supabase.from('scheduled_invoice_occurrences').select('id,status,confirmedAt')
    .eq('id', id).eq('organizationId', user.id).single();
  if (!occurrence || occurrence.status !== 'ERROR') {
    return NextResponse.json({ error: 'La oportunidad no puede reintentarse' }, { status: 409 });
  }
  try {
    return NextResponse.json(await issueScheduledOccurrence(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error de emisión' }, { status: 502 });
  }
}
