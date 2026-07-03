-- Categoría actual del monotributista (A-K), editable en Configuración > Empresa.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "categoriaMonotributo" TEXT
  CHECK ("categoriaMonotributo" IS NULL OR "categoriaMonotributo" IN ('A','B','C','D','E','F','G','H','I','J','K'));

-- Tabla de referencia (no por organización) con los topes de ingresos brutos anuales por
-- categoría de Monotributo. ARCA actualiza la escala ~2 veces al año (ventanas de enero y
-- julio) — nunca se hardcodea en el código, se versiona por "vigenteDesde" y se carga a mano
-- desde el panel admin (/mayor/monotributo) tomando la fuente oficial:
-- https://www.afip.gob.ar/monotributo/categorias.asp
create table if not exists categorias_monotributo_vigentes (
  id                    uuid primary key default gen_random_uuid(),
  categoria             text not null check (categoria in ('A','B','C','D','E','F','G','H','I','J','K')),
  "topeIngresosBrutos"  numeric(14,2) not null,
  "vigenteDesde"        date not null,
  "createdAt"           timestamptz not null default now(),
  unique (categoria, "vigenteDesde")
);

create index if not exists categorias_monotributo_vigentes_fecha_idx
  on categorias_monotributo_vigentes ("vigenteDesde" desc);

alter table categorias_monotributo_vigentes enable row level security;

-- Solo lectura para usuarios autenticados; las escrituras las hace el panel admin con el
-- service-role client (bypassea RLS), no hay policy de insert/update/delete para usuarios comunes.
create policy "usuarios autenticados leen las categorias vigentes"
  on categorias_monotributo_vigentes for select
  using (auth.role() = 'authenticated');

-- Seed: escala vigente desde el 1/02/2026 (fuente: afip.gob.ar/monotributo/categorias.asp).
insert into categorias_monotributo_vigentes (categoria, "topeIngresosBrutos", "vigenteDesde") values
  ('A', 10277988.13, '2026-02-01'),
  ('B', 15058447.71, '2026-02-01'),
  ('C', 21113696.52, '2026-02-01'),
  ('D', 26212853.42, '2026-02-01'),
  ('E', 30833964.37, '2026-02-01'),
  ('F', 38642048.36, '2026-02-01'),
  ('G', 46211109.37, '2026-02-01'),
  ('H', 70113407.33, '2026-02-01'),
  ('I', 78479211.62, '2026-02-01'),
  ('J', 89872640.30, '2026-02-01'),
  ('K', 108357084.05, '2026-02-01')
on conflict (categoria, "vigenteDesde") do nothing;
