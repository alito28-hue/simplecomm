create table if not exists bank_transaction_invoices (
  id uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references auth.users(id) on delete cascade,
  bank text not null,
  "operationRef" text not null,
  "transactionDate" date,
  amount numeric(12,2),
  "payerName" text,
  "payerCuit" text,
  "invoiceNumber" text,
  cae text,
  "createdAt" timestamptz not null default now(),
  unique ("organizationId", bank, "operationRef")
);

alter table bank_transaction_invoices enable row level security;

create policy "org members can manage their bank transaction invoices"
  on bank_transaction_invoices for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
