import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplecomm.com.ar';

/**
 * Crea un link de pago de Mercado Pago (Checkout Pro) para una "Venta Rápida": en vez de
 * facturar ahora, se guarda la venta en pending_sales y se genera un link para compartir por
 * WhatsApp. Cuando el comprador paga, el webhook de MP (api/webhooks/mercadopago) matchea el
 * pago contra este registro por external_reference, recién ahí descuenta stock y factura.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    amount, description, invoiceLetter, ivaRate, docType, docNumber, buyerName,
    productId, quantity, recipientEmail,
  } = await req.json();

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
  if (!invoiceLetter) return NextResponse.json({ error: 'Falta el tipo de comprobante' }, { status: 400 });

  const { data: integration } = await supabase.from('integrations')
    .select('accessToken, status')
    .eq('organizationId', user.id).eq('platform', 'MERCADO_PAGO').maybeSingle();

  if (!integration?.accessToken || integration.status !== 'CONNECTED') {
    return NextResponse.json({ error: 'Conectá Mercado Pago primero en Integraciones → Mercado Pago.' }, { status: 400 });
  }

  const { data: pending, error: insertError } = await supabase.from('pending_sales').insert({
    organizationId: user.id,
    productId: productId || null,
    quantity: quantity || null,
    docType: docType || null,
    docNumber: docNumber || null,
    buyerName: buyerName || null,
    description: description || 'Venta',
    amount,
    invoiceLetter,
    ivaRate: ivaRate ?? 21,
    recipientEmail: recipientEmail || null,
  }).select('id').single();

  if (insertError || !pending) {
    return NextResponse.json({ error: insertError?.message ?? 'No se pudo registrar la venta' }, { status: 500 });
  }

  try {
    const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integration.accessToken}`,
      },
      body: JSON.stringify({
        items: [{
          title: description || 'Venta',
          quantity: 1,
          unit_price: Number(amount),
          currency_id: 'ARS',
        }],
        external_reference: pending.id,
        notification_url: `${APP_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${APP_URL}/dashboard/facturacion/simplificada?pago=exitoso`,
          pending: `${APP_URL}/dashboard/facturacion/simplificada?pago=pendiente`,
          failure: `${APP_URL}/dashboard/facturacion/simplificada?pago=error`,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!prefRes.ok) {
      const text = await prefRes.text().catch(() => '');
      await supabase.from('pending_sales').update({ status: 'CANCELLED' }).eq('id', pending.id);
      return NextResponse.json({ error: `Mercado Pago no pudo generar el link (${prefRes.status}): ${text}` }, { status: 502 });
    }

    const pref = await prefRes.json();
    const paymentLink = pref.init_point ?? pref.sandbox_init_point;

    await supabase.from('pending_sales')
      .update({ mpPreferenceId: pref.id, paymentLink })
      .eq('id', pending.id);

    return NextResponse.json({ pendingSaleId: pending.id, paymentLink });
  } catch (err) {
    await supabase.from('pending_sales').update({ status: 'CANCELLED' }).eq('id', pending.id);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al generar el link de pago' }, { status: 502 });
  }
}
