create table if not exists mp_payment_invoices (
  id              uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references auth.users(id) on delete cascade,
  "paymentId"      text not null,
  "invoiceNumber"  text,
  cae             text,
  amount          numeric(12,2),
  "payerName"     text,
  "payerEmail"    text,
  "payerDocType"  text,
  "payerDocNumber" text,
  "createdAt"     timestamptz not null default now(),
  unique ("organizationId", "paymentId")
);

alter table mp_payment_invoices enable row level security;

create policy "org members can manage their mp invoices"
  on mp_payment_invoices
  for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
