-- Campos estructurados para poder matchear compras (manuales, por IA o importadas)
-- contra "Mis Comprobantes" de ARCA por clave natural (emisor + tipo + punto de venta + número).
alter table purchase_invoices add column if not exists "puntoVenta" integer;
alter table purchase_invoices add column if not exists "tipoComprobante" integer;
alter table purchase_invoices alter column source drop default;
alter table purchase_invoices drop constraint if exists purchase_invoices_source_check;
alter table purchase_invoices add constraint purchase_invoices_source_check
  check (source in ('manual', 'extracted', 'arca_import'));
alter table purchase_invoices alter column source set default 'manual';

create unique index if not exists purchase_invoices_natural_key_idx
  on purchase_invoices ("organizationId", "issuerCuit", "tipoComprobante", "puntoVenta", "invoiceNumber");

-- Ventas emitidas importadas desde "Mis Comprobantes" de ARCA.
-- Se fusiona con las facturas emitidas por el Gateway al calcular la posición de IVA
-- (dedup por tipoComprobante + puntoVenta + numeroComprobante, ver iva-position/route.ts),
-- así que esta tabla solo necesita guardar lo importado, no un espejo de todo.
create table if not exists arca_sales_invoices (
  id                    uuid primary key default gen_random_uuid(),
  "organizationId"      uuid not null references auth.users(id) on delete cascade,
  "tipoComprobante"     integer not null,
  "puntoVenta"          integer not null,
  "numeroComprobante"   integer not null,
  "numeroHasta"         integer,
  "issueDate"           date,
  "receptorCuit"        text,
  "receptorNombre"      text,
  "netAmount"           numeric(14,2) not null default 0,
  "ivaAmount"           numeric(14,2) not null default 0,
  "totalAmount"         numeric(14,2) not null default 0,
  cae                   text,
  raw                   jsonb,
  "createdAt"           timestamptz not null default now(),
  unique ("organizationId", "tipoComprobante", "puntoVenta", "numeroComprobante")
);

create index if not exists arca_sales_invoices_org_date_idx
  on arca_sales_invoices ("organizationId", "issueDate");

alter table arca_sales_invoices enable row level security;

create policy "org members manage their arca sales invoices"
  on arca_sales_invoices for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");

-- Historial de importaciones de ARCA (para mostrar "Última importación: 15/7").
create table if not exists arca_import_log (
  id                uuid primary key default gen_random_uuid(),
  "organizationId"  uuid not null references auth.users(id) on delete cascade,
  "importType"      text not null check ("importType" in ('emitidos', 'recibidos')),
  "rowCount"        integer not null default 0,
  "newCount"        integer not null default 0,
  "updatedCount"    integer not null default 0,
  "importedAt"      timestamptz not null default now()
);

create index if not exists arca_import_log_org_type_idx
  on arca_import_log ("organizationId", "importType", "importedAt" desc);

alter table arca_import_log enable row level security;

create policy "org members manage their arca import log"
  on arca_import_log for all
  using (auth.uid() = "organizationId")
  with check (auth.uid() = "organizationId");
