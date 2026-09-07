-- Retenciones y percepciones clasificadas por impuesto (ver spec_retenciones_percepciones_ganancias.md,
-- armado con el contador, 01/09/2026). Reemplaza el intento anterior de restar todo lo cargado
-- como retención/percepción del saldo de Ganancias sin saber a qué impuesto correspondía —
-- eso podía mostrar un "a pagar" más bajo del real (IVA/IIBB no compensan Ganancias).
--
-- Regla: solo lo clasificado como GANANCIAS se descuenta del Impuesto a las Ganancias estimado.
-- Todo lo demás (IVA, IIBB, o sin clasificar) se muestra aparte, informativo, sin aplicar.
create table if not exists retenciones_percepciones (
  id uuid primary key default gen_random_uuid(),
  "organizationId" text not null,
  monto numeric(12,2) not null,
  "tipoImpuesto" text not null default 'SIN_CLASIFICAR'
    check ("tipoImpuesto" in ('GANANCIAS', 'IVA', 'IIBB', 'SIN_CLASIFICAR')),
  origen text not null default 'MANUAL'
    check (origen in ('COMPROBANTE_RETENCION', 'INFERIDO_BANCO', 'MANUAL')),
  fecha date not null,
  -- Referencia opcional a la venta/cobro que originó esta retención (id de factura del Gateway
  -- o "arca-<id>" de lo importado — mismo formato que invoice_payments."invoiceId").
  "invoiceId" text,
  -- Metadata de auditoría cuando origen = COMPROBANTE_RETENCION (código SICORE leído del
  -- comprobante real de retención, RG AFIP 2233/2007 Anexo III — ej. Impuesto 217 = Ganancias).
  "codigoImpuestoAFIP" int,
  "codigoRegimenAFIP" int,
  "cuitAgenteRetencion" text,
  alicuota numeric(6, 4),
  "importeOperacionBase" numeric(12, 2),
  "fileUrl" text,
  "createdAt" timestamptz not null default now()
);

create index if not exists retenciones_percepciones_org_fecha_idx
  on retenciones_percepciones ("organizationId", fecha);
create index if not exists retenciones_percepciones_invoice_idx
  on retenciones_percepciones ("invoiceId");
