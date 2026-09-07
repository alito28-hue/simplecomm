-- Categoría Pyme de la empresa — determina qué % del Impuesto a los Créditos y Débitos
-- (Ley 25413) es computable como pago a cuenta de Ganancias (ver
-- spec_costos_bancarios_cobro_y_posicion_iibb.md): 33% general, 100% micro/pequeña,
-- 60% mediana tramo 1 manufacturera.
alter table organizations add column if not exists "categoriaPyme" text not null default 'GENERAL'
  check ("categoriaPyme" in ('GENERAL', 'MICRO_PEQUENA', 'MEDIANA_TRAMO1_MANUFACTURERA'));
