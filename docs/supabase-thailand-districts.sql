create table if not exists public.thailand_districts (
  id text primary key,
  province_code text not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  geometry jsonb not null default '{}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  source text not null,
  updated_at timestamptz not null default now()
);

create index if not exists thailand_districts_province_code_idx
  on public.thailand_districts (province_code);

create index if not exists thailand_districts_name_idx
  on public.thailand_districts (name);
