-- Override manual del impuesto determinado de un ejercicio de Ganancias — el contador puede
-- ajustar (a mano) el resultado que SimpleComm estima automáticamente al cerrar el balance.
-- Ese valor, cuando existe, es la base real que usan los anticipos del ejercicio siguiente
-- (11,11% x 9 cuotas, según ARCA) en vez de la estimación automática.
--
-- Sin RLS a propósito, igual que movimientos_cobro/retenciones_percepciones: el scoping por
-- organización lo hace la API (siempre filtra por organizationId = user.id autenticado).
create table if not exists ganancias_ajustes_ejercicio (
  id uuid primary key default gen_random_uuid(),
  "organizationId" text not null,
  anio integer not null, -- año de cierre del ejercicio (ej. 2026 para "Ejercicio 2026")
  "impuestoDeterminado" numeric(14,2) not null,
  notas text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("organizationId", anio)
);

create index if not exists ganancias_ajustes_ejercicio_org_idx
  on ganancias_ajustes_ejercicio ("organizationId");
