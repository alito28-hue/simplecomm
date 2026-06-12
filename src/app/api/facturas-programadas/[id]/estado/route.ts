import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { effectiveDateForMonth, monthKey, nextMonth } from '@/lib/scheduled-invoices/schedule';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action } = await req.json();
  if (!['pause', 'resume', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }
  const { data: schedule } = await supabase.from('scheduled_invoices').select('*')
    .eq('id', id).eq('organizationId', user.id).single();
  if (!schedule) return NextResponse.json({ error: 'Programación no encontrada' }, { status: 404 });

  const changes: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (action === 'pause') changes.status = 'PAUSED';
  if (action === 'cancel') {
    changes.status = 'CANCELLED';
    changes.nextEffectiveDate = null;
    await supabase.from('scheduled_invoice_occurrences').update({
      status: 'CANCELLED', updatedAt: new Date().toISOString(),
    }).eq('scheduledInvoiceId', id).eq('status', 'PENDING_CONFIRMATION');
  }
  if (action === 'resume') {
    const today = new Date().toISOString().slice(0, 10);
    const next = nextMonth(monthKey(today));
    changes.status = 'ACTIVE';
    changes.nextEffectiveDate = effectiveDateForMonth(schedule.firstDate, next);
  }
  const { data, error } = await supabase.from('scheduled_invoices').update(changes)
    .eq('id', id).eq('organizationId', user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

