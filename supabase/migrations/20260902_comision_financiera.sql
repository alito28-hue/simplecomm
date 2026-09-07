-- Comisión que cobra una financiera por descontar un cheque (cambiarlo por efectivo antes
-- de su vencimiento) — a diferencia de IIBB/Ley 25413 (que son impuestos/percepciones sobre
-- una acreditación bancaria real), esto es un gasto financiero genuino: no hay depósito, no
-- hay percepción de IIBB, no hay Ley 25413. Se trata como costo real del cobro (baja el
-- resultado real estimado), sin la lógica de "% computable" que sí aplica a Ley 25413.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'movimientos_cobro'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%tipo%';

  if constraint_name is not null then
    execute format('alter table movimientos_cobro drop constraint %I', constraint_name);
  end if;
end $$;

alter table movimientos_cobro add constraint movimientos_cobro_tipo_check
  check (tipo in ('PERCEPCION_IIBB_BANCO', 'LEY25413_CREDITO', 'LEY25413_DEBITO', 'COMISION_FINANCIERA', 'OTRO_SIN_CLASIFICAR'));
