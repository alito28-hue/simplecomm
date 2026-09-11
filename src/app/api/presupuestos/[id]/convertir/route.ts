import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyLowStockIfNeeded } from '@/lib/stock-alerts';

interface StockItem { productId: string; quantity: number; }

/**
 * Marca el presupuesto como convertido, llamado por el formulario de Comprobante Manual
 * inmediatamente después de emitir con éxito la factura pre-cargada desde este presupuesto.
 * No emite nada acá — la factura ya se emitió en el flujo normal de facturación.
 *
 * También descuenta stock de cada ítem del presupuesto que estaba linkeado a un producto del
 * catálogo — a diferencia de Facturación Rápida (que solo trackea un producto por comprobante,
 * limitación del modelo de factura de AFIP), acá si el presupuesto tenía varios productos se
 * descuentan todos. Usa las cantidades tal como se terminaron emitiendo (después de cualquier
 * edición del usuario en el formulario), no las originales del presupuesto.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { invoiceNumber, items } = await req.json() as { invoiceNumber?: string; items?: StockItem[] };

  const { data, error } = await supabase.from('quotes')
    .update({ status: 'CONVERTIDO', convertedInvoiceNumber: invoiceNumber ?? null, convertedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .eq('id', id).eq('organizationId', user.id).select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

  for (const item of items ?? []) {
    if (!item.productId || !item.quantity) continue;
    const { data: product } = await supabase.from('products')
      .select('stock, stockMinimo, description').eq('id', item.productId).eq('organizationId', user.id).maybeSingle();
    if (product && product.stock !== null) {
      const newStock = Math.max(0, product.stock - item.quantity);
      await supabase.from('products')
        .update({ stock: newStock, updatedAt: new Date().toISOString() })
        .eq('id', item.productId).eq('organizationId', user.id);
      await notifyLowStockIfNeeded(user.id, { id: item.productId, description: product.description, stockMinimo: product.stockMinimo }, product.stock, newStock);
    }
  }

  return NextResponse.json(data);
}
