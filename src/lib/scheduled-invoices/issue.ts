import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { checkAndIncrementUsage } from '@/lib/usage';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'SimpleComm <info@simplecomm.com.ar>';

interface Snapshot {
  amount: number;
  description: string;
  invoiceLetter: 'A' | 'B' | 'C';
  ivaRate: number;
  concept: number;
  buyerName: string;
  docType: string;
  docNumber: string;
  recipientEmail: string;
}

export async function issueScheduledOccurrence(occurrenceId: string) {
  const admin = createAdminClient();
  const { data: occurrence, error } = await admin
    .from('scheduled_invoice_occurrences')
    .select('*')
    .eq('id', occurrenceId)
    .single();
  if (error || !occurrence) throw new Error('Oportunidad no encontrada');
  if (occurrence.status === 'ISSUED') return occurrence;

  const snapshot = occurrence.snapshot as Snapshot;
  await admin.from('scheduled_invoice_occurrences').update({
    status: 'PROCESSING',
    errorMessage: null,
    updatedAt: new Date().toISOString(),
  }).eq('id', occurrence.id);

  try {
    const usage = await checkAndIncrementUsage(occurrence.organizationId);
    if (!usage.allowed) throw new Error(usage.reason ?? 'Límite del plan alcanzado');

    const gatewayApiKey = await getGatewayKey(occurrence.organizationId);
    const response = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayApiKey}`,
      },
      body: JSON.stringify({
        idempotency_key: occurrence.idempotencyKey,
        invoice: {
          total_amount: snapshot.amount,
          invoice_letter: snapshot.invoiceLetter,
          iva_rate: snapshot.ivaRate,
          concept: snapshot.concept,
          description: snapshot.description,
        },
        buyer: {
          full_name: snapshot.buyerName,
          doc_type: snapshot.docType,
          doc_number: snapshot.docNumber,
        },
        source_app: 'simplecomm-scheduled',
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Error del gateway');

    let emailStatus = 'NOT_SENT';
    if (snapshot.recipientEmail && data.pdf_base64) {
      const email = await resend.emails.send({
        from: FROM_EMAIL,
        to: snapshot.recipientEmail,
        subject: `Tu comprobante ${data.invoice_number} - SimpleComm`,
        html: `<p>Hola ${snapshot.buyerName},</p><p>Tu comprobante electrónico está adjunto.</p>`,
        attachments: [{
          filename: `factura-${data.invoice_number}.pdf`,
          content: Buffer.from(data.pdf_base64, 'base64'),
        }],
      });
      emailStatus = email.error ? 'ERROR' : 'SENT';
    }

    const now = new Date().toISOString();
    const { data: updated } = await admin.from('scheduled_invoice_occurrences').update({
      status: 'ISSUED',
      invoiceNumber: data.invoice_number,
      cae: data.cae,
      pdfBase64: data.pdf_base64,
      emailStatus,
      issuedAt: now,
      updatedAt: now,
    }).eq('id', occurrence.id).select().single();

    const { data: schedule } = await admin.from('scheduled_invoices')
      .select('issuedCount,endType,endValue').eq('id', occurrence.scheduledInvoiceId).single();
    if (schedule) {
      const issuedCount = Number(schedule.issuedCount) + 1;
      const finished = schedule.endType === 'INVOICES' && issuedCount >= Number(schedule.endValue);
      const changes: Record<string, unknown> = {
        issuedCount,
        updatedAt: now,
      };
      if (finished) {
        changes.status = 'FINISHED';
        changes.nextEffectiveDate = null;
      }
      await admin.from('scheduled_invoices').update(changes).eq('id', occurrence.scheduledInvoiceId);
    }
    return updated;
  } catch (errorValue) {
    const message = errorValue instanceof Error ? errorValue.message : 'Error de emisión';
    await admin.from('scheduled_invoice_occurrences').update({
      status: 'ERROR',
      errorMessage: message,
      updatedAt: new Date().toISOString(),
    }).eq('id', occurrence.id);
    throw errorValue;
  }
}
