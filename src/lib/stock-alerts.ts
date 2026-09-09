import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_STOCK_WARNING = 5;

/**
 * Notifica una sola vez cuando una venta hace que el stock cruce hacia abajo el umbral de
 * alerta (previousStock por encima del umbral, newStock por debajo o igual) — no en cada
 * venta subsiguiente mientras el stock se mantiene bajo, para no inundar de notificaciones
 * repetidas por el mismo producto.
 */
export async function notifyLowStockIfNeeded(
  organizationId: string,
  product: { id: string; description: string; stockMinimo: number | null },
  previousStock: number,
  newStock: number,
) {
  const threshold = product.stockMinimo ?? DEFAULT_STOCK_WARNING;
  const crossedDown = previousStock > threshold && newStock <= threshold;
  if (!crossedDown) return;

  const admin = createAdminClient();
  await admin.from('notifications').insert({
    id: randomUUID(),
    organizationId,
    type: newStock === 0 ? 'error' : 'info',
    title: newStock === 0 ? 'Producto sin stock' : 'Stock bajo',
    body: newStock === 0
      ? `"${product.description}" se quedó sin stock.`
      : `Quedan ${newStock} unidades de "${product.description}" — por debajo del umbral configurado (${threshold}).`,
    actionUrl: '/dashboard/organizacion/productos',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}
