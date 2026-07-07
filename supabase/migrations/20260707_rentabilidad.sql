-- Costo (precio de compra) por producto, para poder calcular rentabilidad de lo vendido.
-- Un solo valor "actual", no historial de compras por lote — al vender se copia este valor
-- a venta_items.unitCost en ese momento, así que un cambio de costo a futuro no reescribe
-- ventas viejas.
alter table products add column if not exists costo numeric(14,2);

-- Costo de envío estimado por defecto, para cuando no se cargó el costo real de logística de
-- una venta (a mano) ni vino de Envíopack. Nulo = no mostrar estimación, dejarlo en blanco.
alter table organizations add column if not exists "costoLogisticaDefault" numeric(14,2);

-- Un renglón por cada producto vendido, sin importar el canal (SimpleComm directo —
-- Facturación Rápida/Manual/Lotes—, Tiendanube, Shopify, MercadoLibre o Mercado Pago vía
-- Venta Rápida). Es la única fuente para calcular rentabilidad: unitCost y shippingCost se
-- completan al momento de la venta, no se recalculan después.
create table if not exists venta_items (
  id                    uuid primary key default gen_random_uuid(),
  "organizationId"      uuid not null references auth.users(id) on delete cascade,
  "productId"           text references products(id) on delete set null,
  origin                text not null check (origin in ('simplecomm', 'tiendanube', 'shopify', 'mercadolibre', 'mercadopago')),
  "invoiceId"           text,
  "externalOrderId"     text,
  quantity              integer not null check (quantity > 0),
  "unitPrice"           numeric(14,2) not null default 0,
  "unitCost"            numeric(14,2),
  "shippingCost"        numeric(14,2),
  "shippingCostSource"  text check ("shippingCostSource" in ('manual', 'enviopack', 'estimado')),
  "createdAt"           timestamptz not null default now()
);

create index if not exists venta_items_org_date_idx on venta_items ("organizationId", "createdAt" desc);
create index if not exists venta_items_org_product_idx on venta_items ("organizationId", "productId");

alter table venta_items enable row level security;

create policy "org members manage their venta items"
  on venta_items for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
