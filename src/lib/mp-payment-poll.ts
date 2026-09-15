import { createAdminClient } from '@/lib/supabase/admin';
import { getGatewayKey, GATEWAY_URL } from '@/lib/gateway';
import { checkAndIncrementUsage } from '@/lib/usage';
import { claimMpPayment } from '@/lib/mp-payment-claims';
import { createPendingInvoice } from '@/lib/pending-platform-invoices';
import { detectInvoiceType } from '@/lib/detect-invoice-type';

const IVA_RATE = 0.21;
const OVERLAP_MS = 2 * 60 * 60 * 1000; // 2hs de margen sobre el último checkpoint
const MAX_WINDOW_MS = 48 * 60 * 60 * 1000; // si nunca corrió, no mirar más de 48hs atrás
const MAX_PAGES = 5; // tope de páginas de /v1/payments/search por integración y corrida

interface MpSearchPayment {
  id: number;
  status: string;
  transaction_amount: number;
  description?: string;
  date_approved?: string;
  payer?: { first_name?: string; last_name?: string; email?: string; identification?: { type?: string; number?: string } };
}

/**
 * Backup del webhook de Mercado Pago: Mercado Pago solo notifica pagos hechos con las
 * credenciales de esta app (Mercado Libre o "Cobrar con link de MP" de Facturación Rápida) —
 * nunca cobros que el vendedor genera directo desde la app de MP (link, QR, Point), aunque la
 * plata caiga en la misma cuenta. Corre una vez por día: le pregunta a Mercado Pago qué cobros
 * tuvo la cuenta en la ventana de tiempo, y factura los que todavía no tengan factura.
 */
export async function runMercadoPagoPoll(): Promise<{ processed: number; issued: number; pending: number; skipped: number }> {
  const db = createAdminClient();
  const stats = { processed: 0, issued: 0, pending: 0, skipped: 0 };

  const { data: integrations } = await db.from('integrations')
    .select('organizationId, accessToken, mode, lastPolledAt')
    .eq('platform', 'MERCADO_PAGO').eq('status', 'CONNECTED');

  for (const integration of integrations ?? []) {
    if (integration.mode === 'PAUSED' || !integration.accessToken) continue;

    const now = new Date();
    const checkpoint = integration.lastPolledAt ? new Date(integration.lastPolledAt) : null;
    const earliestAllowed = new Date(now.getTime() - MAX_WINDOW_MS);
    const beginDate = checkpoint && checkpoint.getTime() - OVERLAP_MS > earliestAllowed.getTime()
      ? new Date(checkpoint.getTime() - OVERLAP_MS)
      : earliestAllowed;

    const { data: org } = await db.from('organizations').select('fiscalTreatment').eq('id', integration.organizationId).maybeSingle();
    const sellerFiscalTreatment = org?.fiscalTreatment ?? 'RESPONSABLE_INSCRIPTO';

    let offset = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        sort: 'date_created', criteria: 'asc', range: 'date_created',
        begin_date: beginDate.toISOString(), end_date: now.toISOString(),
        limit: '30', offset: String(offset),
      });

      let json: { results?: MpSearchPayment[]; paging?: { total: number } };
      try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/search?${params}`, {
          headers: { Authorization: `Bearer ${integration.accessToken}` },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          console.error(`[MP poll] Error buscando pagos para org ${integration.organizationId}: ${res.status}`);
          break;
        }
        json = await res.json();
      } catch (err) {
        console.error(`[MP poll] Fallo la consulta a MP para org ${integration.organizationId}:`, err);
        break;
      }

      const results = json.results ?? [];
      if (results.length === 0) break;

      for (const payment of results) {
        if (payment.status !== 'approved') continue;
        stats.processed++;

        const claim = await claimMpPayment(integration.organizationId, String(payment.id), 'mercadopago');
        if (!claim.claimed) { stats.skipped++; continue; }

        // Guarda contra doble facturación si el pago ya se facturó por otro canal directo a
        // nuestra API (ej. una integración propia del cliente) — no tenemos forma genérica de
        // saber si YA se facturó salvo revisar si ya existe algo parecido cerca en el tiempo.
        const approvedAt = payment.date_approved ? new Date(payment.date_approved) : now;
        const windowFrom = new Date(approvedAt.getTime() - 60 * 60 * 1000).toISOString();
        const windowTo = new Date(approvedAt.getTime() + 60 * 60 * 1000).toISOString();
        const alreadyInvoiced = await checkExistingInvoiceNearby(integration.organizationId, payment.transaction_amount, windowFrom, windowTo);
        if (alreadyInvoiced) {
          console.log(`[MP poll] Pago ${payment.id} parece ya facturado por otro canal (monto y horario coinciden) — se omite.`);
          stats.skipped++;
          continue;
        }

        const identification = payment.payer?.identification ?? {};
        const buyerDocType = identification.type ?? null;
        const buyerDocNumber = String(identification.number ?? '').replace(/\D/g, '') || null;
        const buyerName = [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(' ')
          || payment.payer?.email || 'Consumidor Final';
        const { letter, docType, docNumber } = detectInvoiceType(sellerFiscalTreatment, buyerDocType, buyerDocNumber);
        const amountForGateway = letter === 'A'
          ? Math.round((payment.transaction_amount / (1 + IVA_RATE)) * 100) / 100
          : payment.transaction_amount;
        const description = payment.description || `Pago MP #${payment.id}`;

        if (integration.mode === 'CONFIRMATION') {
          await createPendingInvoice({
            organizationId: integration.organizationId,
            platform: 'mercadopago',
            externalRef: String(payment.id),
            buyerName, buyerDocType: docType, buyerDocNumber: docNumber,
            buyerEmail: payment.payer?.email || null,
            amount: amountForGateway, invoiceLetter: letter, description,
            metadata: { mpPaymentId: payment.id, source: 'poll' },
          });
          stats.pending++;
          continue;
        }

        const usageCheck = await checkAndIncrementUsage(integration.organizationId);
        if (!usageCheck.allowed) {
          console.warn(`[MP poll] Límite de plan alcanzado para org ${integration.organizationId} — se corta esta corrida.`);
          break;
        }

        try {
          const gatewayApiKey = await getGatewayKey(integration.organizationId);
          const gatewayRes = await fetch(`${GATEWAY_URL}/v1/invoices/issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gatewayApiKey}` },
            body: JSON.stringify({
              idempotency_key: `mercadopago:payment:${payment.id}`,
              invoice: { total_amount: amountForGateway, invoice_letter: letter, concept: 1, description },
              buyer: { full_name: buyerName, doc_type: docType, doc_number: docNumber, email: payment.payer?.email },
              source_app: 'mercadopago',
              external_ref: String(payment.id),
              metadata: { mpPaymentId: payment.id, source: 'poll' },
            }),
            signal: AbortSignal.timeout(60_000),
          });
          const invoiceData = await gatewayRes.json();
          if (gatewayRes.ok) {
            console.log(`[MP poll] ✅ Factura ${letter} emitida para pago ${payment.id} — ${invoiceData.invoice_number}`);
            stats.issued++;
          } else {
            console.error(`[MP poll] ❌ Error emitiendo factura para pago ${payment.id}:`, invoiceData.error);
          }
        } catch (err) {
          console.error(`[MP poll] Error de red emitiendo factura para pago ${payment.id}:`, err);
        }
      }

      const total = json.paging?.total ?? results.length;
      offset += results.length;
      if (offset >= total) break;
    }

    await db.from('integrations').update({ lastPolledAt: now.toISOString() })
      .eq('organizationId', integration.organizationId).eq('platform', 'MERCADO_PAGO');
  }

  return stats;
}

async function checkExistingInvoiceNearby(organizationId: string, amount: number, dateFrom: string, dateTo: string): Promise<boolean> {
  const gatewayApiKey = await getGatewayKey(organizationId);
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, limit: '20' });
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/invoices?${params}`, {
      headers: { Authorization: `Bearer ${gatewayApiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const invoices: { total_amount: number; status: string }[] = json.data ?? [];
    return invoices.some(inv => inv.status === 'issued' && Math.abs(Number(inv.total_amount) - amount) < 1);
  } catch {
    // Ante la duda (no pudimos chequear), no bloqueamos la emisión — el idempotency_key del
    // Gateway sigue siendo la última protección para el caso puntual de reintentos nuestros.
    return false;
  }
}
