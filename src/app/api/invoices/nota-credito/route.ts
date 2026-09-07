import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { translateGatewayError } from '@/lib/afip-errors';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function fromEmail(sellerName: string): string {
  const safeName = sellerName.replace(/[<>"]/g, '');
  return `${safeName} <info@simplecomm.com.ar>`;
}

/**
 * Emite una Nota de Crédito TOTAL sobre una factura ya emitida. Toda la lógica de qué letra
 * corresponde (A/B/C), punto de venta, receptor y montos vive en el Gateway — se deriva de
 * la factura original guardada ahí, nunca de datos que reenviemos nosotros. Antes esta ruta
 * intentaba recalcular el tipo de comprobante acá mismo con datos que el Gateway ni siquiera
 * devolvía, lo que terminaba pidiendo a AFIP una Factura B común en vez de una Nota de Crédito
 * (bug real: un monotributista no puede emitir Factura B, AFIP lo rechazaba con "no RI en IVA").
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { originalInvoiceId, recipientEmail } = await req.json();
  if (!originalInvoiceId) {
    return NextResponse.json({ error: 'originalInvoiceId requerido' }, { status: 400 });
  }

  const apiKey = await getGatewayKey(user.id);
  const idempotencyKey = `nc:${user.id}:${originalInvoiceId}:${randomUUID()}`;

  const ncRes = await fetch(`${GATEWAY_URL}/v1/invoices/${originalInvoiceId}/credit-note`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ idempotency_key: idempotencyKey, source_app: 'simplecomm' }),
    signal: AbortSignal.timeout(60_000),
  });

  const ncData = await ncRes.json();

  if (!ncRes.ok) {
    return NextResponse.json({ error: translateGatewayError(ncData.error) }, { status: 502 });
  }

  let emailSent = false;
  if (recipientEmail && ncData.pdf_base64) {
    const { data: org } = await supabase.from('organizations').select('name').eq('id', user.id).maybeSingle();
    const sellerName = org?.name ?? 'SimpleComm';
    const invoiceNumber = ncData.invoice_number ?? 'comprobante';
    const displayName = ncData.buyer_name && ncData.buyer_name !== 'Consumidor Final' ? ncData.buyer_name : recipientEmail;

    try {
      await resend.emails.send({
        from: fromEmail(sellerName),
        to: recipientEmail,
        subject: `Nota de crédito ${invoiceNumber} — ${sellerName}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a2e">
            <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:1.4rem">${sellerName}</h1>
            </div>
            <div style="background:#f9f9fb;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <p style="margin:0 0 8px">Hola ${displayName},</p>
              <p style="margin:0 0 20px;color:#555">Te llegó una nota de crédito de <strong>${sellerName}</strong>. La encontrás adjunta a este correo en PDF.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px">
                <tr>
                  <td style="color:#888;font-size:.875rem;padding-bottom:8px">N° Comprobante</td>
                  <td style="text-align:right;padding-bottom:8px"><strong style="font-family:monospace">${invoiceNumber}</strong></td>
                </tr>
                <tr>
                  <td style="color:#888;font-size:.875rem">CAE</td>
                  <td style="text-align:right"><strong style="font-family:monospace">${ncData.cae ?? '—'}</strong></td>
                </tr>
              </table>
              <p style="font-size:.8rem;color:#999;margin:0">
                Comprobante generado por <a href="https://simplecomm.com.ar" style="color:#2563eb">simplecomm.com.ar</a>.<br>
                Para consultas, comunicate con tu proveedor — este es un email de envío automático.
              </p>
            </div>
          </div>
        `,
        attachments: [{
          filename: `nota-credito-${invoiceNumber}.pdf`,
          content: Buffer.from(ncData.pdf_base64, 'base64'),
        }],
      });
      emailSent = true;
    } catch (err) {
      console.error('[Resend] Failed to send credit note email:', err);
    }
  }

  return NextResponse.json({
    invoiceNumber: ncData.invoice_number,
    cae:           ncData.cae,
    status:        ncData.status,
    emailSent,
  });
}
