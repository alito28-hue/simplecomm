-- Medio de pago usado en cada pago de la suscripción — Mercado Pago ya lo devuelve
-- (payment_method_id, card.last_four_digits) pero antes se descartaba. Se usa para mostrarle
-- al dueño de la cuenta con qué tarjeta/medio pagó cada vez, en vez de no mostrar nada.
alter table subscription_payments add column if not exists "paymentMethod" text;
alter table subscription_payments add column if not exists "cardLastFour" text;
