import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

export interface OrderBuyer {
  businessName: string;
  docType: string;   // 'CUIT' | 'CUIL' | 'DNI' | 'CONSUMIDOR_FINAL'
  docNumber: string;
  email?: string | null;
  phone?: string | null;
  shippingStreet?: string | null;
  shippingNumber?: string | null;
  shippingFloor?: string | null;
  shippingCity?: string | null;
  shippingProvince?: string | null;
  shippingZipCode?: string | null;
}

export interface OrderLineItem {
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ProcessOrderResult {
  alreadyProcessed: boolean;
  clientId: string | null;
  productsCreated: string[];   // ids de productos auto-creados (needsReview = true)
  productsMatched: string[];   // ids de productos existentes a los que se les descontó stock
}

/**
 * Procesa el lado "no facturación" de un pedido entrante de una integración (Tiendanube,
 * Shopify, MercadoLibre): matchea o crea el Contacto, matchea productos por SKU (o crea uno
 * nuevo marcado para revisión si no existe) y descuenta stock. Es idempotente por
 * (organizationId, platform, externalOrderId) — si el webhook se reenvía, no se duplica nada.
 *
 * No emite factura — eso lo sigue haciendo cada webhook con el Gateway, como ya hacía antes.
 * Se usa el cliente admin (service role) porque los webhooks no tienen sesión de usuario.
 */
export async function processIncomingOrder(
  organizationId: string,
  platform: 'tiendanube' | 'shopify' | 'mercadolibre',
  externalOrderId: string,
  buyer: OrderBuyer,
  lineItems: OrderLineItem[],
): Promise<ProcessOrderResult> {
  const db = createAdminClient();

  // --- Idempotencia: si ya procesamos este pedido, no repetir nada ---
  const { error: logError } = await db.from('webhook_orders_log').insert({
    organizationId, platform, externalOrderId,
  });
  if (logError) {
    // 23505 = unique_violation → ya se había procesado este pedido antes
    if (logError.code === '23505') {
      return { alreadyProcessed: true, clientId: null, productsCreated: [], productsMatched: [] };
    }
    console.error(`[order-processing] Error registrando idempotencia (${platform}:${externalOrderId}):`, logError.message);
  }

  // --- Contacto: matchear por docNumber, o crear uno nuevo ---
  let clientId: string | null = null;
  const docNumber = (buyer.docNumber || '').replace(/\D/g, '');
  try {
    if (docNumber && docNumber !== '0') {
      const { data: existing } = await db.from('clients')
        .select('id')
        .eq('organizationId', organizationId)
        .eq('docNumber', docNumber)
        .maybeSingle();

      if (existing) {
        clientId = existing.id;
      } else {
        const now = new Date().toISOString();
        const { data: created, error } = await db.from('clients').insert({
          id: randomUUID(),
          organizationId,
          businessName: buyer.businessName || 'Consumidor Final',
          docType: buyer.docType || 'CONSUMIDOR_FINAL',
          docNumber,
          emailContact: buyer.email || null,
          phone: buyer.phone || null,
          fiscalTreatment: buyer.docType === 'CUIT' ? 'RESPONSABLE_INSCRIPTO' : 'CONSUMIDOR_FINAL',
          shippingStreet: buyer.shippingStreet || null,
          shippingNumber: buyer.shippingNumber || null,
          shippingFloor: buyer.shippingFloor || null,
          shippingCity: buyer.shippingCity || null,
          shippingProvince: buyer.shippingProvince || null,
          shippingZipCode: buyer.shippingZipCode || null,
          createdAt: now,
          updatedAt: now,
        }).select('id').single();
        if (error) throw error;
        clientId = created.id;
      }
    }
  } catch (err) {
    console.error(`[order-processing] Error matcheando/creando contacto (${platform}:${externalOrderId}):`, err);
  }

  // --- Productos: matchear por SKU (o "code" como fallback), descontar stock o auto-crear ---
  const productsCreated: string[] = [];
  const productsMatched: string[] = [];
  const now = new Date().toISOString();

  for (const item of lineItems) {
    if (!item.sku) continue;
    try {
      // Dos consultas separadas (en vez de un .or() con el SKU interpolado) porque el SKU
      // viene de un pedido externo no confiable — evita filter injection en PostgREST.
      let product = (await db.from('products')
        .select('id, stock')
        .eq('organizationId', organizationId)
        .eq('sku', item.sku)
        .maybeSingle()).data;
      if (!product) {
        product = (await db.from('products')
          .select('id, stock')
          .eq('organizationId', organizationId)
          .eq('code', item.sku)
          .maybeSingle()).data;
      }

      if (product) {
        if (product.stock !== null) {
          await db.from('products')
            .update({ stock: Math.max(0, product.stock - item.quantity), updatedAt: now })
            .eq('id', product.id);
        }
        productsMatched.push(product.id);
      } else {
        const { data: created, error } = await db.from('products').insert({
          id: randomUUID(),
          organizationId,
          code: item.sku,
          sku: item.sku,
          description: item.name || item.sku,
          netPrice: item.unitPrice || 0,
          ivaRate: 'IVA_21',
          stock: null,
          needsReview: true,
          createdAt: now,
          updatedAt: now,
        }).select('id').single();
        if (error) throw error;
        productsCreated.push(created.id);
      }
    } catch (err) {
      console.error(`[order-processing] Error matcheando/creando producto SKU=${item.sku} (${platform}:${externalOrderId}):`, err);
    }
  }

  if (productsCreated.length || clientId) {
    await db.from('webhook_orders_log')
      .update({ clientId, productWarnings: productsCreated })
      .eq('organizationId', organizationId).eq('platform', platform).eq('externalOrderId', externalOrderId);
  }

  return { alreadyProcessed: false, clientId, productsCreated, productsMatched };
}
