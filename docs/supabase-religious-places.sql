create table if not exists public.religious_places (
  id text primary key,
  place_id text not null,
  province_code text,
  title_name text,
  main_category text,
  sub_category text,
  full_description_th text,
  tag text,
  location text,
  address_no text,
  address_moo text,
  address_soi text,
  address_road text,
  sub_district text,
  district text,
  province text,
  postcode text,
  latitude double precision,
  longitude double precision,
  source_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists religious_places_place_id_idx
  on public.religious_places (place_id);

create index if not exists religious_places_province_code_idx
  on public.religious_places (province_code);

create index if not exists religious_places_province_idx
  on public.religious_places (province);

create index if not exists religious_places_district_idx
  on public.religious_places (district);

create index if not exists religious_places_title_name_idx
  on public.religious_places (title_name);

update public.cultural_places
set source = 'religious_places'
where id like 'm-culture-religious-%'
  and source = 'culture_catalog';

-- Optional, only enable after every place_id exists in public.cultural_places.
-- alter table public.religious_places
--   add constraint religious_places_place_id_fkey
--   foreign key (place_id) references public.cultural_places(id)
--   on delete cascade;
