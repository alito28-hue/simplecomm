-- Movimientos bancarios automáticos que el banco aplica AL ACREDITAR un cobro — distintos de
-- la retención de Ganancias del pagador (RG 830, ya modelada en retenciones_percepciones):
-- percepción de IIBB (SIRCREB) y el Impuesto a los Créditos y Débitos (Ley 25413), que se
-- aplica dos veces (sobre el crédito del cobro, y sobre el débito de la percepción de IIBB).
-- Ver spec_costos_bancarios_cobro_y_posicion_iibb.md — verificado con extracto real, las
-- tres alícuotas (2,5% IIBB, 0,6% + 0,6% Ley 25413) cierran exactas centavo a centavo.
create table if not exists movimientos_cobro (
  id uuid primary key default gen_random_uuid(),
  "organizationId" text not null,
  "invoiceId" text not null,
  "fechaCobro" date not null,
  tipo text not null
    check (tipo in ('PERCEPCION_IIBB_BANCO', 'LEY25413_CREDITO', 'LEY25413_DEBITO', 'OTRO_SIN_CLASIFICAR')),
  monto numeric(12,2) not null,
  "jurisdiccionIIBB" text,
  alicuota numeric(6,4),
  origen text not null default 'MANUAL' check (origen in ('COMPROBANTE', 'EXTRACTO_BANCARIO', 'MANUAL')),
  "createdAt" timestamptz not null default now()
);

create index if not exists movimientos_cobro_org_fecha_idx
  on movimientos_cobro ("organizationId", "fechaCobro");
create index if not exists movimientos_cobro_invoice_idx
  on movimientos_cobro ("invoiceId");
