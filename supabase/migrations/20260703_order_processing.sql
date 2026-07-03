-- SKU para matchear ítems de pedidos de tiendas externas (Tiendanube/Shopify/MercadoLibre)
-- contra el catálogo local. needsReview marca productos auto-creados desde un pedido para
-- que el usuario los revise (nombre/precio puede venir incompleto de la plataforma externa).
ALTER TABLE products ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- Idempotencia para el procesamiento de pedidos entrantes de integraciones (match/creación de
-- contacto, match/creación de producto, descuento de stock) — independiente de la idempotencia
-- de emisión de factura que ya maneja el Gateway. Los webhooks pueden reenviarse, y estos pasos
-- (a diferencia de emitir la factura) no son idempotentes por sí solos.
create table if not exists webhook_orders_log (
  id                  uuid primary key default gen_random_uuid(),
  "organizationId"    uuid not null references auth.users(id) on delete cascade,
  platform            text not null,
  "externalOrderId"   text not null,
  "clientId"          uuid,
  "productWarnings"   jsonb,
  "processedAt"        timestamptz not null default now(),
  unique ("organizationId", platform, "externalOrderId")
);

alter table webhook_orders_log enable row level security;

create policy "org members manage their webhook orders log"
  on webhook_orders_log for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
