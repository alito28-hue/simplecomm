-- Facturas de una integración (ML/MP) que quedan pendientes de aprobación manual, para las
-- cuentas configuradas en modalidad "Con confirmación" en vez de "Automática". El índice
-- único parcial evita crear dos filas PENDING para el mismo pago si el webhook llega
-- duplicado antes de que el usuario apruebe o rechace.
create table if not exists pending_platform_invoices (
  id uuid primary key default gen_random_uuid(),
  "organizationId" text not null,
  platform text not null, -- 'mercadolibre' | 'mercadopago'
  "externalRef" text not null,
  "buyerName" text not null,
  "buyerDocType" text not null,
  "buyerDocNumber" text not null,
  "buyerEmail" text,
  amount numeric(14,2) not null,
  "invoiceLetter" text not null,
  description text,
  status text not null default 'PENDING', -- PENDING | APPROVED | REJECTED
  metadata jsonb,
  "createdAt" timestamptz not null default now(),
  "resolvedAt" timestamptz
);
create index if not exists pending_platform_invoices_org_idx on pending_platform_invoices ("organizationId", status, "createdAt" desc);
create unique index if not exists pending_platform_invoices_dedup on pending_platform_invoices (platform, "externalRef") where status = 'PENDING';
