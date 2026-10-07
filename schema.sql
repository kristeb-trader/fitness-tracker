-- =====================================================================
-- Seguimiento personal: comida, ejercicio, peso y cintura (FASE 1)
-- Pega TODO este archivo en Supabase > SQL Editor > Run.
-- Seguro de volver a ejecutar: no borra datos existentes.
--
-- Un solo usuario: no hay columna de dueño. La seguridad es:
--   1) RLS activado: solo un usuario con sesión iniciada puede leer/escribir.
--   2) Los registros nuevos se desactivan en Supabase (ver README), así
--      que el único usuario que existe eres tú.
-- El conector de Claude entra con permisos de administrador y no pasa por RLS.
-- =====================================================================

-- ============ COMIDAS ============
create table if not exists comidas (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null default current_date,
  hora         time,
  tipo_comida  text not null check (tipo_comida in ('desayuno','almuerzo','cena','snack')),
  descripcion  text not null,
  kcal         integer      check (kcal >= 0),
  proteina_g   numeric(5,1) check (proteina_g >= 0),
  carbos_g     numeric(5,1) check (carbos_g >= 0),
  grasa_g      numeric(5,1) check (grasa_g >= 0),
  estimado     boolean not null default false,
  creado_en    timestamptz not null default now()
);

-- ============ EJERCICIO ============
create table if not exists ejercicio (
  id            uuid primary key default gen_random_uuid(),
  fecha         date not null default current_date,
  tipo          text not null check (tipo in ('gym','bici','caminata')),
  duracion_min  integer check (duracion_min > 0),
  kcal          integer check (kcal >= 0),
  fuente        text not null default 'manual' check (fuente in ('strava','manual','estimado')),
  strava_id     text unique,  -- para no duplicar actividades al importar de Strava
  notas         text,
  creado_en     timestamptz not null default now()
);

-- ============ SERIES DE GYM ============
create table if not exists series_gym (
  id            uuid primary key default gen_random_uuid(),
  fecha         date not null default current_date,
  rutina        text not null,
  ejercicio     text not null,
  numero_serie  integer not null check (numero_serie > 0),
  peso_kg       numeric(5,1) not null check (peso_kg >= 0),
  repeticiones  integer not null check (repeticiones > 0),
  creado_en     timestamptz not null default now()
);

-- ============ MEDIDAS (una fila por día) ============
create table if not exists medidas (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null unique default current_date,
  peso_kg      numeric(4,1) check (peso_kg > 0),
  cintura_cm   numeric(4,1) check (cintura_cm > 0),
  horas_sueno  numeric(3,1) check (horas_sueno between 0 and 24),
  creado_en    timestamptz not null default now()
);

-- ============ METAS (clave / valor) ============
create table if not exists metas (
  clave  text primary key,
  valor  numeric not null
);

insert into metas (clave, valor) values
  ('proteina_min_g',   130),
  ('proteina_max_g',   160),
  ('kcal_base',       2500),
  ('deficit_min_kcal', 200),
  ('deficit_max_kcal', 300)
on conflict (clave) do nothing;

-- ============ ÍNDICES (para que las gráficas carguen rápido) ============
create index if not exists comidas_fecha_idx    on comidas (fecha);
create index if not exists ejercicio_fecha_idx  on ejercicio (fecha);
create index if not exists series_gym_idx       on series_gym (fecha, ejercicio);

-- ============ SEGURIDAD (RLS) ============
alter table comidas    enable row level security;
alter table ejercicio  enable row level security;
alter table series_gym enable row level security;
alter table medidas    enable row level security;
alter table metas      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['comidas','ejercicio','series_gym','medidas','metas'] loop
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'solo_autenticado'
    ) then
      execute format(
        'create policy solo_autenticado on %I for all to authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;
