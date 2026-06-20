create table if not exists public.place_categories (
  id integer primary key,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.place_sub_categories (
  id integer primary key,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.places (
  id text primary key,
  place_id text not null,
  name text not null,
  status text not null default '',
  slug text,
  province_code text,
  province_id integer,
  province_name text,
  district_id integer,
  district text not null default '',
  sub_district_id integer,
  sub_district text not null default '',
  postcode text,
  address text,
  lat double precision,
  lng double precision,
  category_id integer,
  category_name text,
  sub_category_ids integer[] not null default '{}',
  thumbnail_urls text[] not null default '{}',
  source_url text,
  map_url text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists places_place_id_idx
  on public.places (place_id);

create index if not exists places_province_code_idx
  on public.places (province_code);

create index if not exists places_province_id_idx
  on public.places (province_id);

create index if not exists places_category_id_idx
  on public.places (category_id);

create index if not exists places_slug_idx
  on public.places (slug);
