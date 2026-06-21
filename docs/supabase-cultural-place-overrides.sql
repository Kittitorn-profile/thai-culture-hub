create table if not exists public.cultural_place_overrides (
  place_id text primary key,
  province_code text not null,
  name text,
  source text,
  category text,
  district text,
  lat double precision not null,
  lng double precision not null,
  map_url text,
  image_url text,
  note text,
  updated_by_id uuid,
  updated_by_email text,
  updated_by_name text,
  updated_at timestamptz not null default now()
);

alter table public.cultural_place_overrides
  add column if not exists map_url text;

alter table public.cultural_place_overrides
  add column if not exists image_url text;

alter table public.cultural_place_overrides
  add column if not exists category text;

alter table public.cultural_place_overrides
  add column if not exists updated_by_id uuid;

alter table public.cultural_place_overrides
  add column if not exists updated_by_email text;

alter table public.cultural_place_overrides
  add column if not exists updated_by_name text;

create index if not exists cultural_place_overrides_province_code_idx
  on public.cultural_place_overrides (province_code);

create index if not exists cultural_place_overrides_source_idx
  on public.cultural_place_overrides (source);
