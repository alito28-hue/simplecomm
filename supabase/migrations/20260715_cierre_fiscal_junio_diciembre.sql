-- Restringe el mes de cierre fiscal a las dos opciones reales que ofrecemos (Junio o
-- Diciembre) — la carga original permitía cualquier mes 1-12, pero la UI solo ofrece estas dos.
-- El nombre exacto del constraint autogenerado depende del case de la columna; se intentan
-- las dos variantes (con y sin comillas) para no dejar el constraint viejo (1-12) huérfano.
alter table organizations drop constraint if exists "organizations_cierreFiscalMes_check";
alter table organizations drop constraint if exists organizations_cierrefiscalmes_check;
alter table organizations add constraint "organizations_cierreFiscalMes_check"
  check ("cierreFiscalMes" is null or "cierreFiscalMes" in (6, 12));
