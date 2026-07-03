-- "Venta Rápida" con link de pago de Mercado Pago: en vez de facturar antes de cobrar, se
-- genera un link (Checkout Pro) y recién cuando el webhook de MP confirma el pago se descuenta
-- stock y se emite la factura. Esta tabla es el puente entre la preferencia de MP creada
-- (external_reference) y los datos de la venta (producto, cantidad, comprador, letra) que el
-- webhook necesita para completar la operación.
create table if not exists pending_sales (
  id                    uuid primary key default gen_random_uuid(),
  "organizationId"      uuid not null references auth.users(id) on delete cascade,
  "productId"           uuid,
  quantity              integer,
  "docType"             text,
  "docNumber"           text,
  "buyerName"           text,
  description           text,
  amount                numeric(12,2) not null check (amount > 0),
  "invoiceLetter"       text not null check ("invoiceLetter" in ('A', 'B', 'C')),
  "ivaRate"             numeric(5,2) not null default 21,
  "recipientEmail"      text,
  "mpPreferenceId"      text,
  "paymentLink"         text,
  status                text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
  "createdAt"           timestamptz not null default now(),
  "paidAt"              timestamptz
);

create index if not exists pending_sales_org_status_idx
  on pending_sales ("organizationId", status);

alter table pending_sales enable row level security;

create policy "org members manage their pending sales"
  on pending_sales for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
