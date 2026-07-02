drop table if exists purchase_invoices cascade;

create table purchase_invoices (
  id                uuid primary key default gen_random_uuid(),
  "organizationId"  uuid not null references auth.users(id) on delete cascade,
  "issuerName"      text,
  "issuerCuit"      text,
  "invoiceLetter"   text,
  "invoiceNumber"   text,
  "issueDate"       date,
  "netAmount"       numeric(12,2) not null default 0,
  "ivaAmount"       numeric(12,2) not null default 0,
  "totalAmount"     numeric(12,2) not null check ("totalAmount" > 0),
  source            text not null default 'manual' check (source in ('manual', 'extracted')),
  "fileUrl"         text,
  "extractedRaw"    jsonb,
  "createdAt"       timestamptz not null default now()
);

create index if not exists purchase_invoices_org_date_idx
  on purchase_invoices ("organizationId", "issueDate");

alter table purchase_invoices enable row level security;

create policy "org members manage their purchase invoices"
  on purchase_invoices for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
