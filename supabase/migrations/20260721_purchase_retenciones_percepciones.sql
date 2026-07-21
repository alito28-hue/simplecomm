-- Retenciones y percepciones sufridas en compras — se guardan por comprobante
-- para poder acumularlas por ejercicio fiscal y descontarlas del Impuesto a las
-- Ganancias estimado en Posición de Ganancias (ver src/lib/iva-position.ts).
alter table purchase_invoices add column if not exists "retencionesAmount" numeric(12,2) not null default 0;
alter table purchase_invoices add column if not exists "percepcionesAmount" numeric(12,2) not null default 0;
