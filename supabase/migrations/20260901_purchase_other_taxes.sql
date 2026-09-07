-- Otros tributos (impuestos internos, tasas municipales, etc.) que algunos comprobantes de
-- compra suman por fuera del neto y el IVA — típico en combustible ("Impuesto interno a nivel
-- item" + su propio IVA). No es crédito fiscal de IVA ni retención/percepción: es un costo más
-- del comprobante, así que no entra en el cálculo de Posición de IVA (ver src/lib/iva-position.ts),
-- solo se registra para que neto + iva + otherTaxes = total cierre sin forzar el usuario a
-- meterlo a mano en el neto.
alter table purchase_invoices add column if not exists "otherTaxesAmount" numeric(12,2) not null default 0;
