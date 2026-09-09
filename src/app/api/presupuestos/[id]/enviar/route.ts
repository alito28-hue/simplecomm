import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQuotePdf } from '@/lib/quote-pdf';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function fromEmail(sellerName: string): string {
  const safeName = sellerName.replace(/[<>"]/g, '');
  return `${safeName} <info@simplecomm.com.ar>`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { recipientEmail } = await req.json();
  if (!recipientEmail) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

  const { data: quote } = await supabase.from('quotes')
    .select('*').eq('id', id).eq('organizationId', user.id).maybeSingle();
  if (!quote) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

  const { data: items } = await supabase.from('quote_items')
    .select('description, quantity, unitPrice').eq('quoteId', id).order('sortOrder');

  const { data: org } = await supabase.from('organizations')
    .select('name, cuit, address, city').eq('id', user.id).maybeSingle();
  const sellerName = org?.name ?? 'SimpleComm';

  const pdfBuffer = await generateQuotePdf({
    seller: { name: sellerName, cuit: org?.cuit, address: org?.address, city: org?.city },
    quoteNumber: quote.quoteNumber,
    createdAt: new Date(quote.createdAt),
    validUntil: quote.validUntil,
    buyerName: quote.buyerName,
    buyerDocNumber: quote.buyerDocNumber,
    items: (items ?? []).map(it => ({ description: it.description, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
    totalAmount: Number(quote.totalAmount),
    notes: quote.notes,
  });

  const quoteNumberLabel = String(quote.quoteNumber).padStart(5, '0');
  const totalFmt = Number(quote.totalAmount).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  try {
    await resend.emails.send({
      from: fromEmail(sellerName),
      to: recipientEmail,
      subject: `Presupuesto ${quoteNumberLabel} — ${sellerName}`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a2e">
          <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:1.4rem">${sellerName}</h1>
          </div>
          <div style="background:#f9f9fb;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 8px">Hola ${quote.buyerName},</p>
            <p style="margin:0 0 20px;color:#555">Te llegó un presupuesto de <strong>${sellerName}</strong>. Lo encontrás adjunto a este correo en PDF.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px">
              <tr>
                <td style="color:#888;font-size:.875rem;padding-bottom:8px">N° Presupuesto</td>
                <td style="text-align:right;padding-bottom:8px"><strong style="font-family:monospace">${quoteNumberLabel}</strong></td>
              </tr>
              <tr>
                <td style="color:#888;font-size:.875rem">Total</td>
                <td style="text-align:right"><strong>${totalFmt}</strong></td>
              </tr>
            </table>
            <p style="font-size:.8rem;color:#999;margin:0">
              Presupuesto generado por <a href="https://simplecomm.com.ar" style="color:#2563eb">simplecomm.com.ar</a>. No es un comprobante fiscal.<br>
              Para consultas, comunicate directamente con ${sellerName} — este es un email de envío automático.
            </p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `presupuesto-${quoteNumberLabel}.pdf`,
        content: pdfBuffer,
      }],
    });
  } catch (err) {
    console.error('[Resend] Failed to send quote email:', err);
    return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
