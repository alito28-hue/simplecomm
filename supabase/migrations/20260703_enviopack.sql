-- Peso y dimensiones de producto, necesarios para cotizar envíos con Envíopack.
ALTER TABLE products ADD COLUMN IF NOT EXISTS "pesoKg" NUMERIC(10,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS "altoCm" NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS "anchoCm" NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS "profundidadCm" NUMERIC(10,2);

-- Dirección del comprador, necesaria para cotizar/generar envíos. Se completa automáticamente
-- al crear el Contacto desde un pedido de Tiendanube/Shopify (tienen shipping_address), o a
-- mano si el contacto se cargó manualmente.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "shippingStreet" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "shippingNumber" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "shippingFloor" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "shippingCity" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "shippingProvince" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "shippingZipCode" TEXT;

-- Envíos generados vía Envíopack, uno por factura/pedido. El estado se actualiza por webhook
-- ("envio-cambio-condicion"), nunca por polling — Envíopack no permite consultas repetitivas
-- de tracking por su cuenta, así que dependemos exclusivamente de la notificación.
create table if not exists shipments (
  id                    uuid primary key default gen_random_uuid(),
  "organizationId"      uuid not null references auth.users(id) on delete cascade,
  "invoiceExternalRef"  text,
  "clientId"            uuid,
  "enviopackEnvioId"    text not null,
  "trackingNumber"      text,
  estado                text not null default 'PENDIENTE',
  "labelUrl"            text,
  "costoEnvio"          numeric(12,2),
  "createdAt"           timestamptz not null default now(),
  "updatedAt"           timestamptz not null default now(),
  unique ("organizationId", "enviopackEnvioId")
);

create index if not exists shipments_org_invoice_idx
  on shipments ("organizationId", "invoiceExternalRef");

alter table shipments enable row level security;

create policy "org members manage their shipments"
  on shipments for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
