create table if not exists scheduled_invoices (
  id                    uuid primary key default gen_random_uuid(),
  "organizationId"      uuid not null references auth.users(id) on delete cascade,
  "clientId"            text,
  "buyerName"           text not null,
  "docType"             text not null,
  "docNumber"           text not null,
  description           text not null,
  amount                numeric(12,2) not null check (amount > 0),
  "invoiceLetter"       text not null check ("invoiceLetter" in ('A', 'B', 'C')),
  "ivaRate"             numeric(5,2) not null default 21,
  concept               integer not null default 1 check (concept in (1, 2, 3)),
  "recipientEmail"      text not null,
  "firstDate"           date not null,
  "modelDay"            integer not null check ("modelDay" between 1 and 31),
  mode                  text not null check (mode in ('AUTOMATIC', 'CONFIRMATION')),
  "endType"             text not null default 'NONE' check ("endType" in ('NONE', 'MONTHS', 'INVOICES')),
  "endValue"            integer check ("endValue" is null or "endValue" > 0),
  "processedMonths"     integer not null default 0,
  "issuedCount"         integer not null default 0,
  status                text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED')),
  "nextEffectiveDate"   date,
  "createdAt"           timestamptz not null default now(),
  "updatedAt"           timestamptz not null default now()
);

create table if not exists scheduled_invoice_occurrences (
  id                    uuid primary key default gen_random_uuid(),
  "organizationId"      uuid not null references auth.users(id) on delete cascade,
  "scheduledInvoiceId"  uuid not null references scheduled_invoices(id) on delete cascade,
  month                 text not null,
  "scheduledDate"       text not null,
  "effectiveDate"       date not null,
  snapshot              jsonb not null,
  status                text not null check (status in ('PENDING_CONFIRMATION', 'PROCESSING', 'ISSUED', 'EXPIRED', 'ERROR', 'CANCELLED')),
  "idempotencyKey"      text not null unique,
  "invoiceNumber"       text,
  cae                   text,
  "pdfBase64"           text,
  "emailStatus"         text not null default 'NOT_SENT' check ("emailStatus" in ('NOT_SENT', 'SENT', 'ERROR')),
  "notifiedAt"          timestamptz,
  "confirmedAt"         timestamptz,
  "confirmedBy"         uuid references auth.users(id) on delete set null,
  "issuedAt"            timestamptz,
  "errorMessage"        text,
  "createdAt"           timestamptz not null default now(),
  "updatedAt"           timestamptz not null default now(),
  unique ("scheduledInvoiceId", month)
);

create index if not exists scheduled_invoices_due_idx
  on scheduled_invoices (status, "nextEffectiveDate");
create index if not exists scheduled_occurrences_status_month_idx
  on scheduled_invoice_occurrences (status, month);

alter table scheduled_invoices enable row level security;
alter table scheduled_invoice_occurrences enable row level security;

create policy "org members manage scheduled invoices"
  on scheduled_invoices for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");

create policy "org members manage scheduled occurrences"
  on scheduled_invoice_occurrences for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
