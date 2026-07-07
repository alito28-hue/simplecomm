import { createAdminClient } from '@/lib/supabase/admin';

export type VentaOrigin = 'simplecomm' | 'tiendanube' | 'shopify' | 'mercadolibre' | 'mercadopago';

interface RegistrarVentaItemInput {
  organizationId: string;
  productId: string;
  origin: VentaOrigin;
  invoiceId?: string | null;
  externalOrderId?: string | null;
  quantity: number;
  unitPrice: number;
}

/**
 * Registra un renglón de venta con el costo del producto copiado en ESTE momento — si el
 * costo del producto se actualiza más adelante, esta venta ya vendida no se mueve. Se llama
 * desde los 3 puntos donde hoy se descuenta stock: Facturación Rápida/Manual/Lotes, pedidos
 * de tiendas conectadas (Tiendanube/Shopify/ML) y Venta Rápida confirmada por Mercado Pago.
 * Es la única fuente de datos para la sección de Rentabilidad.
 */
export async function registrarVentaItem(input: RegistrarVentaItemInput): Promise<void> {
  const db = createAdminClient();
  try {
    const { data: product } = await db.from('products')
      .select('costo')
      .eq('id', input.productId)
      .eq('organizationId', input.organizationId)
      .maybeSingle();

    const { error } = await db.from('venta_items').insert({
      organizationId: input.organizationId,
      productId: input.productId,
      origin: input.origin,
      invoiceId: input.invoiceId ?? null,
      externalOrderId: input.externalOrderId ?? null,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      unitCost: product?.costo ?? null,
    });
    if (error) console.error('[venta-items] Error insertando venta_item:', error.message);
  } catch (err) {
    console.error('[venta-items] Error registrando venta item:', err);
  }
}
