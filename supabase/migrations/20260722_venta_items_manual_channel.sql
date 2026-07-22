-- Etiqueta opcional para ventas directas (origin='simplecomm', sin integración real detrás):
-- de qué canal vino la venta (Instagram, WhatsApp, Presencial, etc.), cargada a mano por el
-- usuario al facturar. Sirve para que el módulo de Ventas pueda desglosar "Directo" en vez de
-- mostrarlo como un solo bloque sin distinción de origen real de la venta.
alter table venta_items add column if not exists "manualChannel" text;
