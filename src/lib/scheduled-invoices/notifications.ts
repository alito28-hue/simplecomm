import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'SimpleComm <info@simplecomm.com.ar>';

export async function notifyConfirmation(
  organizationId: string,
  scheduledInvoiceId: string,
  occurrenceId: string,
  buyerName: string,
  amount: number,
) {
  const admin = createAdminClient();
  const actionUrl = `/dashboard/facturacion/programadas/${scheduledInvoiceId}?occurrence=${occurrenceId}`;
  await admin.from('notifications').insert({
    id: randomUUID(),
    organizationId,
    type: 'info',
    title: 'Factura programada pendiente',
    body: `Confirmá la factura de ${buyerName} por $${amount.toLocaleString('es-AR')}.`,
    actionUrl,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  const { data: org } = await admin.from('organizations')
    .select('emailAlerts').eq('id', organizationId).maybeSingle();
  if (!org?.emailAlerts) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';
  await resend.emails.send({
    from: FROM_EMAIL,
    to: org.emailAlerts,
    subject: 'Tenés una factura programada para confirmar',
    html: `<p>Tenés una factura repetitiva para emitir.</p>
      <p>Confirmá el pedido para que podamos emitirla y enviarla.</p>
      <p><a href="${baseUrl}${actionUrl}">Revisar y confirmar</a></p>`,
  });
}

export async function notifyScheduleError(organizationId: string, body: string, actionUrl: string) {
  const admin = createAdminClient();
  await admin.from('notifications').insert({
    id: randomUUID(),
    organizationId,
    type: 'error',
    title: 'Error en factura programada',
    body,
    actionUrl,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}
