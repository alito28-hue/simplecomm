-- Mes de cierre del ejercicio fiscal (1-12). Lo carga el propio cliente en Empresa —
-- no todas las organizaciones cierran en diciembre (ej. Mocla S.A. cierra en junio).
-- Nulo = todavía no lo configuró, no se puede calcular la Posición de Ganancias.
alter table organizations add column if not exists "cierreFiscalMes" integer
  check ("cierreFiscalMes" is null or "cierreFiscalMes" between 1 and 12);

-- Alícuota de Impuesto a las Ganancias a aplicar sobre la ganancia estimada (%). No se
-- hardcodea ningún valor por defecto — cambia según tipo de sociedad y período, y no
-- queremos afirmar una alícuota vigente sin que el cliente la confirme.
alter table organizations add column if not exists "alicuotaGanancias" numeric(5,2)
  check ("alicuotaGanancias" is null or ("alicuotaGanancias" >= 0 and "alicuotaGanancias" <= 100));
