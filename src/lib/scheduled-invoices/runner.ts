import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { effectiveDateForMonth, hasReachedEnd, monthKey, nextMonth } from './schedule';
import { issueScheduledOccurrence } from './issue';
import { notifyConfirmation, notifyScheduleError } from './notifications';
import type { ScheduledInvoice } from './types';

export function todayInArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function runScheduledInvoices(today = todayInArgentina()) {
  const admin = createAdminClient();
  const currentMonth = monthKey(today);

  await admin.from('scheduled_invoice_occurrences').update({
    status: 'EXPIRED',
    errorMessage: 'No emitida por falta de confirmación',
    updatedAt: new Date().toISOString(),
  }).eq('status', 'PENDING_CONFIRMATION').lt('month', currentMonth);

  const { data: unnotified } = await admin.from('scheduled_invoice_occurrences')
    .select('id,organizationId,scheduledInvoiceId,snapshot')
    .eq('status', 'PENDING_CONFIRMATION')
    .is('notifiedAt', null);
  for (const occurrence of unnotified ?? []) {
    const snapshot = occurrence.snapshot as { buyerName: string; amount: number };
    await notifyConfirmation(
      occurrence.organizationId,
      occurrence.scheduledInvoiceId,
      occurrence.id,
      snapshot.buyerName,
      Number(snapshot.amount),
    );
    await admin.from('scheduled_invoice_occurrences').update({
      notifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq('id', occurrence.id);
  }

  const { data: interrupted } = await admin.from('scheduled_invoice_occurrences')
    .select('id').eq('status', 'PROCESSING');
  for (const occurrence of interrupted ?? []) {
    try {
      await issueScheduledOccurrence(occurrence.id);
    } catch {
      // issueScheduledOccurrence records the error for manual retry.
    }
  }

  const { data: schedules, error } = await admin.from('scheduled_invoices')
    .select('*')
    .eq('status', 'ACTIVE')
    .lte('nextEffectiveDate', today);
  if (error) throw error;

  const results = [];
  for (const raw of schedules ?? []) {
    const schedule = raw as ScheduledInvoice;
    if (hasReachedEnd(schedule.endType, schedule.endValue, schedule.processedMonths, schedule.issuedCount)) {
      await admin.from('scheduled_invoices').update({ status: 'FINISHED', nextEffectiveDate: null }).eq('id', schedule.id);
      continue;
    }

    const occurrenceMonth = monthKey(schedule.nextEffectiveDate!);
    const snapshot = {
      amount: Number(schedule.amount),
      description: schedule.description,
      invoiceLetter: schedule.invoiceLetter,
      ivaRate: Number(schedule.ivaRate),
      concept: schedule.concept,
      buyerName: schedule.buyerName,
      docType: schedule.docType,
      docNumber: schedule.docNumber,
      recipientEmail: schedule.recipientEmail,
    };
    const occurrenceId = randomUUID();
    const { data: occurrence, error: insertError } = await admin
      .from('scheduled_invoice_occurrences')
      .upsert({
        id: occurrenceId,
        organizationId: schedule.organizationId,
        scheduledInvoiceId: schedule.id,
        month: occurrenceMonth,
        scheduledDate: `${occurrenceMonth}-${String(schedule.modelDay).padStart(2, '0')}`,
        effectiveDate: schedule.nextEffectiveDate,
        snapshot,
        status: schedule.mode === 'AUTOMATIC' ? 'PROCESSING' : 'PENDING_CONFIRMATION',
        idempotencyKey: `scheduled:${schedule.id}:${occurrenceMonth}`,
        notifiedAt: null,
      }, { onConflict: 'scheduledInvoiceId,month', ignoreDuplicates: true })
      .select().maybeSingle();

    const processedMonths = schedule.processedMonths + 1;
    const followingMonth = nextMonth(occurrenceMonth);
    const finishedByMonths = hasReachedEnd(schedule.endType, schedule.endValue, processedMonths, schedule.issuedCount);
    await admin.from('scheduled_invoices').update({
      processedMonths,
      status: finishedByMonths ? 'FINISHED' : 'ACTIVE',
      nextEffectiveDate: finishedByMonths ? null : effectiveDateForMonth(schedule.firstDate, followingMonth),
      updatedAt: new Date().toISOString(),
    }).eq('id', schedule.id);

    if (!occurrence || insertError) continue;
    if (schedule.mode === 'CONFIRMATION') {
      await notifyConfirmation(schedule.organizationId, schedule.id, occurrence.id, schedule.buyerName, Number(schedule.amount));
      await admin.from('scheduled_invoice_occurrences').update({
        notifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).eq('id', occurrence.id);
    } else {
      try {
        await issueScheduledOccurrence(occurrence.id);
      } catch (issueError) {
        await notifyScheduleError(
          schedule.organizationId,
          issueError instanceof Error ? issueError.message : 'Error de emisión',
          `/dashboard/facturacion/programadas/${schedule.id}`,
        );
      }
    }
    results.push(occurrence.id);
  }
  return { processed: results.length };
}
