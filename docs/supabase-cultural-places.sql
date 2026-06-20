create table if not exists public.cultural_places (
  id text primary key,
  province_code text not null,
  name text not null,
  district text not null default '',
  category text not null,
  lat double precision not null,
  lng double precision not null,
  description text not null default '',
  highlight text not null default '',
  image_urls text[] not null default '{}',
  source_url text,
  map_url text,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists cultural_places_province_code_idx
  on public.cultural_places (province_code);

create index if not exists cultural_places_source_idx
  on public.cultural_places (source);

create index if not exists cultural_places_category_idx
  on public.cultural_places (category);
