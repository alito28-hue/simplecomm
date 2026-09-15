-- Checkpoint del cron diario de Mercado Pago (src/lib/mp-payment-poll.ts): hasta qué momento
-- ya se revisaron los cobros de esta integración vía /v1/payments/search, para no reprocesar
-- toda la ventana cada corrida.
alter table integrations add column if not exists "lastPolledAt" timestamptz;
