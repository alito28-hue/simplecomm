import { createAdminClient } from '@/lib/supabase/admin';

export type VentaOrigin = 'simplecomm' | 'tiendanube' | 'shopify' | 'mercadolibre' | 'mercadopago';

interface RegistrarVentaItemInput {
  organizationId: string;
  productId?: string | null;
  origin: VentaOrigin;
  invoiceId?: string | null;
  externalOrderId?: string | null;
  quantity: number;
  unitPrice: number;
}

/**
 * Registra un renglón de venta con el costo del producto copiado en ESTE momento — si el
 * costo del producto se actualiza más adelante, esta venta ya vendida no se mueve. Se llama
 * desde los puntos donde hoy se descuenta stock o se procesa un pedido: Facturación
 * Rápida/Manual/Lotes, pedidos de tiendas conectadas (Tiendanube/Shopify/ML) y Venta Rápida
 * confirmada por Mercado Pago. Es la única fuente de datos para Rentabilidad y para el
 * módulo de Ventas (totales por canal).
 *
 * productId puede venir null (pedido de un canal sin SKU identificable, o no matcheable
 * contra el catálogo) — igual se registra el renglón para no perder el monto/unidad del
 * total de Ventas por canal, sin costo asociado (no afecta Rentabilidad, que ya tolera
 * unitCost null).
 */
export async function registrarVentaItem(input: RegistrarVentaItemInput): Promise<void> {
  const db = createAdminClient();
  try {
    let unitCost: number | null = null;
    if (input.productId) {
      const { data: product } = await db.from('products')
        .select('costo')
        .eq('id', input.productId)
        .eq('organizationId', input.organizationId)
        .maybeSingle();
      unitCost = product?.costo ?? null;
    }

    const { error } = await db.from('venta_items').insert({
      organizationId: input.organizationId,
      productId: input.productId ?? null,
      origin: input.origin,
      invoiceId: input.invoiceId ?? null,
      externalOrderId: input.externalOrderId ?? null,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      unitCost,
    });
    if (error) console.error('[venta-items] Error insertando venta_item:', error.message);
  } catch (err) {
    console.error('[venta-items] Error registrando venta item:', err);
  }
}
