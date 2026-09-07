-- Alícuota de percepción de IIBB (SIRCREB) que el banco te aplica al acreditar cobros —
-- varía por jurisdicción/actividad, así que se configura por empresa (a diferencia de Ley
-- 25413, que es una tasa fija del 0,6% para todos). Se usa para sugerir el monto de la
-- percepción en el modal de "marcar como cobrada", sin que el usuario tenga que calcularlo.
alter table organizations add column if not exists "alicuotaIibb" numeric(6,4) not null default 2.5;
