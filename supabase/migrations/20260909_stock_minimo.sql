-- Umbral de stock mínimo por producto, para poder avisar cuando se está por agotar en vez
-- de que el dueño lo note recién cuando ya llegó a cero. Null = sin alerta configurada (el
-- producto sigue usando el badge de advertencia genérico basado en el umbral fijo actual).
alter table products add column if not exists "stockMinimo" integer;
