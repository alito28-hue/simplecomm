import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { buildInvoiceFilename } from '@/lib/invoice-filename';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function fromEmail(sellerName: string): string {
  const safeName = sellerName.replace(/[<>"]/g, '');
  return `${safeName} <info@simplecomm.com.ar>`;
}

const INVOICE_TYPE_LETTER: Record<number, string> = {
  1: 'A', 3: 'A', 2: 'A',
  6: 'B', 8: 'B', 7: 'B',
  11: 'C', 13: 'C', 12: 'C',
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { email } = await req.json().catch(() => ({ email: null }));
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = await getGatewayKey(user.id);

  const [invoiceRes, pdfRes] = await Promise.all([
    fetch(`${GATEWAY_URL}/v1/invoices/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    }),
    fetch(`${GATEWAY_URL}/v1/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    }),
  ]);

  if (!invoiceRes.ok || !pdfRes.ok) {
    return NextResponse.json({ error: 'Comprobante o PDF no disponible' }, { status: 404 });
  }

  const invoice = await invoiceRes.json();
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  const { data: org } = await supabase.from('organizations').select('name, cuit').eq('id', user.id).maybeSingle();
  const sellerName = org?.name ?? 'SimpleComm';
  const invoiceNumber = invoice.invoice_number ?? 'comprobante';
  const letter = INVOICE_TYPE_LETTER[invoice.invoice_type] ?? 'B';
  const displayName = invoice.buyer_name && invoice.buyer_name !== 'Consumidor Final' ? invoice.buyer_name : email;
  const montoFmt = Number(invoice.total_amount).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  try {
    await resend.emails.send({
      from: fromEmail(sellerName),
      to: email,
      subject: `Tu comprobante ${invoiceNumber} — ${sellerName}`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a2e">
          <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:1.4rem">${sellerName}</h1>
          </div>
          <div style="background:#f9f9fb;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 8px">Hola ${displayName},</p>
            <p style="margin:0 0 20px;color:#555">Te reenviamos el comprobante electrónico de <strong>${sellerName}</strong>. Lo encontrás adjunto a este correo en PDF.</p>
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
                <td style="text-align:right"><strong style="font-family:monospace">${invoice.cae ?? '—'}</strong></td>
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
        filename: org?.cuit && invoice.invoice_number
          ? buildInvoiceFilename(org.cuit, letter, invoice.invoice_number)
          : `factura-${invoiceNumber}.pdf`,
        content: pdfBuffer,
      }],
    });
  } catch (err) {
    console.error('[Resend] Failed to resend invoice email:', err);
    return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
