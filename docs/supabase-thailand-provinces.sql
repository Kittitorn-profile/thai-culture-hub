create table if not exists public.thailand_provinces (
  id text primary key,
  name text not null,
  region text not null default '',
  lat double precision not null,
  lng double precision not null,
  geometry jsonb not null default '{}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  source text not null,
  updated_at timestamptz not null default now()
);

create index if not exists thailand_provinces_region_idx
  on public.thailand_provinces (region);

create index if not exists thailand_provinces_name_idx
  on public.thailand_provinces (name);
