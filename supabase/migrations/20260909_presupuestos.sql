-- Presupuestos/cotizaciones: documento comercial previo a la factura, no fiscal (sin CAE, no
-- pasa por el Gateway de ARCA). Numeración propia por organización, independiente de la
-- numeración AFIP de comprobantes. Mismo criterio que el resto de las tablas recientes:
-- organizationId como text, sin RLS (scoping a nivel de aplicación).
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  "organizationId" text not null,
  "quoteNumber" integer not null,
  "buyerName" text not null,
  "buyerDocType" text,
  "buyerDocNumber" text,
  "buyerEmail" text,
  status text not null default 'PENDIENTE', -- PENDIENTE | ACEPTADO | RECHAZADO | CONVERTIDO
  "validUntil" date,
  notes text,
  "totalAmount" numeric(14,2) not null default 0,
  "convertedInvoiceNumber" text,
  "convertedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists quotes_org_idx on quotes ("organizationId", "createdAt" desc);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  "quoteId" uuid not null references quotes(id) on delete cascade,
  "productId" text,
  description text not null,
  quantity numeric(12,2) not null default 1,
  "unitPrice" numeric(14,2) not null default 0,
  "sortOrder" integer not null default 0
);
create index if not exists quote_items_quote_idx on quote_items ("quoteId");
