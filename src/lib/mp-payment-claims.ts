import { createAdminClient } from '@/lib/supabase/admin';

export type ClaimSource = 'mercadolibre' | 'mercadopago';

/**
 * Reclama un pago de Mercado Pago para un origen (orden de MercadoLibre o pago directo de
 * Mercado Pago), para que una misma venta real no termine facturada dos veces cuando ambas
 * integraciones están conectadas a la vez — una venta de MercadoLibre se cobra por dentro de
 * Mercado Pago, así que el mismo pago puede llegar por los dos webhooks.
 *
 * Gana quien reclama primero. Un reintento del MISMO origen (reentrega de webhook, o un
 * intento anterior que falló antes de llegar a emitir) no queda bloqueado — eso ya lo protege
 * el idempotency_key del Gateway; acá solo se bloquea el OTRO origen.
 */
export async function claimMpPayment(
  organizationId: string,
  mpPaymentId: string,
  source: ClaimSource,
): Promise<{ claimed: boolean; claimedBy?: ClaimSource }> {
  const db = createAdminClient();

  const { data: existing } = await db.from('mp_payment_claims')
    .select('source').eq('organizationId', organizationId).eq('mpPaymentId', mpPaymentId).maybeSingle();

  if (existing) {
    return existing.source === source ? { claimed: true } : { claimed: false, claimedBy: existing.source as ClaimSource };
  }

  const { error } = await db.from('mp_payment_claims').insert({
    organizationId, mpPaymentId, source, claimedAt: new Date().toISOString(),
  });

  if (error) {
    // Conflicto de clave única: el otro origen lo reclamó justo entre el SELECT y el INSERT.
    if (error.code === '23505') {
      const { data: winner } = await db.from('mp_payment_claims')
        .select('source').eq('organizationId', organizationId).eq('mpPaymentId', mpPaymentId).maybeSingle();
      return winner?.source === source ? { claimed: true } : { claimed: false, claimedBy: winner?.source as ClaimSource | undefined };
    }
    // Error inesperado de infraestructura: mejor dejar pasar la facturación (el
    // idempotency_key del Gateway sigue siendo la última protección) que bloquear una venta
    // real por un problema de la tabla de reclamos.
    return { claimed: true };
  }

  return { claimed: true };
}
