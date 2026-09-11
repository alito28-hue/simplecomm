-- Evita duplicar una factura cuando una misma venta llega por dos webhooks a la vez — una
-- venta de MercadoLibre se cobra a través de Mercado Pago, así que si ambas integraciones
-- están conectadas, el mismo pago puede disparar tanto el webhook de ML (por la orden) como
-- el de MP (por el pago). Gana quien reclama primero el mpPaymentId; el otro se abstiene de
-- facturar. Ver src/lib/mp-payment-claims.ts.
create table if not exists mp_payment_claims (
  "organizationId" text not null,
  "mpPaymentId" text not null,
  source text not null, -- 'mercadolibre' | 'mercadopago'
  "claimedAt" timestamptz not null default now(),
  primary key ("organizationId", "mpPaymentId")
);
