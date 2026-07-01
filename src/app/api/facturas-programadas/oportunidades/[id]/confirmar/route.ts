import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { issueScheduledOccurrence } from '@/lib/scheduled-invoices/issue';
import { monthKey } from '@/lib/scheduled-invoices/schedule';
import { translateGatewayError } from '@/lib/afip-errors';

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: occurrence } = await supabase.from('scheduled_invoice_occurrences').select('*')
    .eq('id', id).eq('organizationId', user.id).single();
  if (!occurrence) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
  if (occurrence.status !== 'PENDING_CONFIRMATION' || occurrence.month < monthKey(new Date().toISOString())) {
    return NextResponse.json({ error: 'Esta solicitud ya no puede confirmarse' }, { status: 409 });
  }
  await supabase.from('scheduled_invoice_occurrences').update({
    confirmedAt: new Date().toISOString(),
    confirmedBy: user.id,
    updatedAt: new Date().toISOString(),
  }).eq('id', id);
  try {
    return NextResponse.json(await issueScheduledOccurrence(id));
  } catch (error) {
    return NextResponse.json({ error: translateGatewayError(error instanceof Error ? error.message : 'Error de emisión') }, { status: 502 });
  }
}

