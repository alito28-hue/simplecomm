import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { checkAndIncrementUsage } from '@/lib/usage';
import { getAllowedInvoiceLetters } from '@/lib/fiscal';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'SimpleComm <info@simplecomm.com.ar>';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    amount,
    description,
    docNumber,
    docType,
    buyerName,
    concept,
    invoiceLetter = 'B',
    ivaRate = 21,
    buyerCuit,
    recipientEmail,
    serviceDateFrom,
    serviceDateTo,
    paymentDueDate,
  } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
  }

  // AFIP requiere período facturado para concepto Servicios/Ambos.
  // Si el usuario no los completó, usamos el mes en curso como default.
  let resolvedServiceDateFrom = serviceDateFrom;
  let resolvedServiceDateTo   = serviceDateTo;
  let resolvedPaymentDueDate  = paymentDueDate;
  if (concept && concept !== 1) {
    const now  = new Date();
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
    if (!resolvedServiceDateFrom) resolvedServiceDateFrom = `${yyyy}-${mm}-01`;
    if (!resolvedServiceDateTo)   resolvedServiceDateTo   = `${yyyy}-${mm}-${lastDay}`;
    if (!resolvedPaymentDueDate)  resolvedPaymentDueDate  = `${yyyy}-${mm}-${lastDay}`;
  }

  const { data: org } = await supabase.from('organizations')
    .select('fiscalTreatment').eq('id', user.id).maybeSingle();

  const allowedLetters = getAllowedInvoiceLetters(org?.fiscalTreatment);
  if (!allowedLetters.includes(invoiceLetter)) {
    return NextResponse.json({
      error: `Tu condición fiscal no permite emitir Factura ${invoiceLetter}. Tipos permitidos: ${allowedLetters.map(l => `Factura ${l}`).join(', ')}.`,
    }, { status: 400 });
  }

  const finalDocType = invoiceLetter === 'A'
    ? 'CUIT'
    : (docType ?? (docNumber ? 'DNI' : 'CONSUMIDOR_FINAL'));

  const finalDocNumber = invoiceLetter === 'A'
    ? (buyerCuit || docNumber || '0')
    : (docNumber || '0');

  const usageCheck = await checkAndIncrementUsage(user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.reason, limitReached: true }, { status: 402 });
  }

  const idempotencyKey = `${user.id}:${randomUUID()}`;

  const body = {
    idempotency_key: idempotencyKey,
    invoice: {
      total_amount:   amount,
      invoice_letter: invoiceLetter,
      iva_rate:       ivaRate,
      concept:        concept ?? 1,
      description:    description ?? 'Venta',
      service_date_from: resolvedServiceDateFrom,
      service_date_to:   resolvedServiceDateTo,
      payment_due_date:  resolvedPaymentDueDate,
    },
    buyer: {
      full_name:  buyerName ?? 'Consumidor Final',
      doc_type:   finalDocType,
      doc_number: finalDocNumber,
    },
    source_app: 'simplecomm',
  };

  const gatewayApiKey = await getGatewayKey(user.id);
  const res = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${gatewayApiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Gateway error' }, { status: 502 });
  }

  // Send PDF by email if requested
  if (recipientEmail && data.pdf_base64) {
    const invoiceNumber = data.invoice_number ?? 'comprobante';
    const displayName   = buyerName && buyerName !== 'Consumidor Final' ? buyerName : recipientEmail;

    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      recipientEmail,
      subject: `Tu comprobante ${invoiceNumber} — SimpleComm`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a2e">
          <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:1.4rem">SimpleComm</h1>
          </div>
          <div style="background:#f9f9fb;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 8px">Hola ${displayName},</p>
            <p style="margin:0 0 20px;color:#555">Tu comprobante electrónico ya está disponible. Lo encontrás adjunto a este correo.</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span style="color:#888;font-size:.875rem">N° Comprobante</span>
                <strong style="font-family:monospace">${invoiceNumber}</strong>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:#888;font-size:.875rem">CAE</span>
                <strong style="font-family:monospace">${data.cae ?? '—'}</strong>
              </div>
            </div>
            <p style="font-size:.8rem;color:#999;margin:0">
              Este comprobante fue generado automáticamente por SimpleComm.<br>
              Para consultas, respondé este email o ingresá a <a href="https://simplecomm.com.ar" style="color:#2563eb">simplecomm.com.ar</a>
            </p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `factura-${invoiceNumber}.pdf`,
        content:  Buffer.from(data.pdf_base64, 'base64'),
      }],
    }).catch(err => {
      console.error('[Resend] Failed to send invoice email:', err);
    });
  }

  return NextResponse.json({
    invoiceNumber: data.invoice_number,
    cae:           data.cae,
    caeDueDate:    data.cae_due_date,
    pdfBase64:     data.pdf_base64,
    status:        data.status,
    emailSent:     !!(recipientEmail && data.pdf_base64),
  });
}
