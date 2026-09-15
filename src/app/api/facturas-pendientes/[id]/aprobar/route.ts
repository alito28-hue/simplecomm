import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { checkAndIncrementUsage } from '@/lib/usage';
import { translateGatewayError } from '@/lib/afip-errors';
import { buildInvoiceFilename } from '@/lib/invoice-filename';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function fromEmail(sellerName: string): string {
  const safeName = sellerName.replace(/[<>"]/g, '');
  return `${safeName} <info@simplecomm.com.ar>`;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: pending } = await admin.from('pending_platform_invoices')
    .select('*').eq('id', id).eq('organizationId', user.id).eq('status', 'PENDING').maybeSingle();
  if (!pending) return NextResponse.json({ error: 'No encontrada o ya resuelta' }, { status: 404 });

  const usageCheck = await checkAndIncrementUsage(user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.reason, limitReached: true }, { status: 402 });
  }

  const idempotencyKey = `${pending.platform}:pending:${pending.id}`;
  const gatewayApiKey = await getGatewayKey(user.id);
  const gatewayRes = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gatewayApiKey}` },
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      invoice: {
        total_amount: Number(pending.amount),
        invoice_letter: pending.invoiceLetter,
        concept: 1,
        description: pending.description ?? undefined,
      },
      buyer: {
        full_name: pending.buyerName,
        doc_type: pending.buyerDocType,
        doc_number: pending.buyerDocNumber,
        email: pending.buyerEmail ?? undefined,
      },
      source_app: pending.platform,
      external_ref: pending.externalRef,
      metadata: pending.metadata ?? undefined,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const invoiceData = await gatewayRes.json();
  if (!gatewayRes.ok) {
    // La dejamos en PENDING — el usuario puede corregir algo (ej. el plan) y reintentar.
    return NextResponse.json({ error: translateGatewayError(invoiceData.error) }, { status: 502 });
  }

  await admin.from('pending_platform_invoices')
    .update({ status: 'APPROVED', resolvedAt: new Date().toISOString() })
    .eq('id', id);

  let emailSent = false;
  if (pending.buyerEmail && invoiceData.pdf_base64) {
    const { data: org } = await admin.from('organizations').select('name, cuit').eq('id', user.id).maybeSingle();
    const sellerName = org?.name ?? 'SimpleComm';
    const invoiceNumber = invoiceData.invoice_number ?? 'comprobante';
    const displayName = pending.buyerName && pending.buyerName !== 'Consumidor Final' ? pending.buyerName : pending.buyerEmail;
    const montoFmt = Number(pending.amount).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

    try {
      await resend.emails.send({
        from: fromEmail(sellerName),
        to: pending.buyerEmail,
        subject: `Tu comprobante ${invoiceNumber} — ${sellerName}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a2e">
            <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:1.4rem">${sellerName}</h1>
            </div>
            <div style="background:#f9f9fb;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <p style="margin:0 0 8px">Hola ${displayName},</p>
              <p style="margin:0 0 20px;color:#555">Tu comprobante electrónico de <strong>${sellerName}</strong> ya está disponible. Lo encontrás adjunto a este correo en PDF.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px">
                <tr>
                  <td style="color:#888;font-size:.875rem;padding-bottom:8px">N° Comprobante</td>
                  <td style="text-align:right;padding-bottom:8px"><strong style="font-family:monospace">${invoiceNumber}</strong></td>
                </tr>
                <tr>
                  <td style="color:#888;font-size:.875rem;padding-bottom:8px">Monto</td>
                  <td style="text-align:right;padding-bottom:8px"><strong>${montoFmt}</strong></td>
                </tr>
                <tr>
                  <td style="color:#888;font-size:.875rem">CAE</td>
                  <td style="text-align:right"><strong style="font-family:monospace">${invoiceData.cae ?? '—'}</strong></td>
                </tr>
              </table>
              <p style="font-size:.8rem;color:#999;margin:0">
                Comprobante generado por <a href="https://simplecomm.com.ar" style="color:#2563eb">simplecomm.com.ar</a>.<br>
                Para consultas sobre tu compra, comunicate con tu proveedor — este es un email de envío automático.
              </p>
            </div>
          </div>
        `,
        attachments: [{
          filename: org?.cuit && invoiceData.invoice_number
            ? buildInvoiceFilename(org.cuit, pending.invoiceLetter, invoiceData.invoice_number)
            : `factura-${invoiceNumber}.pdf`,
          content: Buffer.from(invoiceData.pdf_base64, 'base64'),
        }],
      });
      emailSent = true;
    } catch (err) {
      console.error('[Resend] Failed to send pending-invoice email:', err);
    }
  }

  return NextResponse.json({
    invoiceNumber: invoiceData.invoice_number,
    cae: invoiceData.cae,
    status: invoiceData.status,
    emailSent,
  });
}
