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
 * Emite una Nota de Débito por un cargo adicional (intereses, ajuste de precio, etc.)
 * asociado a una factura ya emitida. Letra, receptor y punto de venta se derivan de la
 * factura original en el Gateway — igual que la Nota de Crédito — pero acá el monto y el
 * motivo los define quien llama, porque una Nota de Débito no anula el comprobante original,
 * agrega un cargo nuevo.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { originalInvoiceId, amount, reason, recipientEmail } = await req.json();
  if (!originalInvoiceId) {
    return NextResponse.json({ error: 'originalInvoiceId requerido' }, { status: 400 });
  }
  const parsedAmount = Number(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    return NextResponse.json({ error: 'El monto debe ser mayor a cero' }, { status: 400 });
  }
  if (!reason || !String(reason).trim()) {
    return NextResponse.json({ error: 'El motivo es obligatorio' }, { status: 400 });
  }

  const apiKey = await getGatewayKey(user.id);
  const idempotencyKey = `nd:${user.id}:${originalInvoiceId}:${randomUUID()}`;

  const ndRes = await fetch(`${GATEWAY_URL}/v1/invoices/${originalInvoiceId}/debit-note`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      amount: parsedAmount,
      reason: String(reason).trim(),
      source_app: 'simplecomm',
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const ndData = await ndRes.json();

  if (!ndRes.ok) {
    return NextResponse.json({ error: translateGatewayError(ndData.error) }, { status: 502 });
  }

  let emailSent = false;
  if (recipientEmail && ndData.pdf_base64) {
    const { data: org } = await supabase.from('organizations').select('name').eq('id', user.id).maybeSingle();
    const sellerName = org?.name ?? 'SimpleComm';
    const invoiceNumber = ndData.invoice_number ?? 'comprobante';
    const displayName = ndData.buyer_name && ndData.buyer_name !== 'Consumidor Final' ? ndData.buyer_name : recipientEmail;

    try {
      await resend.emails.send({
        from: fromEmail(sellerName),
        to: recipientEmail,
        subject: `Nota de débito ${invoiceNumber} — ${sellerName}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a2e">
            <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:1.4rem">${sellerName}</h1>
            </div>
            <div style="background:#f9f9fb;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <p style="margin:0 0 8px">Hola ${displayName},</p>
              <p style="margin:0 0 20px;color:#555">Te llegó una nota de débito de <strong>${sellerName}</strong>. La encontrás adjunta a este correo en PDF.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px">
                <tr>
                  <td style="color:#888;font-size:.875rem;padding-bottom:8px">N° Comprobante</td>
                  <td style="text-align:right;padding-bottom:8px"><strong style="font-family:monospace">${invoiceNumber}</strong></td>
                </tr>
                <tr>
                  <td style="color:#888;font-size:.875rem">CAE</td>
                  <td style="text-align:right"><strong style="font-family:monospace">${ndData.cae ?? '—'}</strong></td>
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
          filename: `nota-debito-${invoiceNumber}.pdf`,
          content: Buffer.from(ndData.pdf_base64, 'base64'),
        }],
      });
      emailSent = true;
    } catch (err) {
      console.error('[Resend] Failed to send debit note email:', err);
    }
  }

  return NextResponse.json({
    invoiceNumber: ndData.invoice_number,
    cae:           ndData.cae,
    status:        ndData.status,
    emailSent,
  });
}
