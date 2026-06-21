create table if not exists public.cultural_place_details (
  place_id text primary key,
  province_code text,
  name_th text,
  name_en text,
  detail_th text,
  detail_en text,
  nearby_location text,
  category_id text,
  category_label text,
  type_id text,
  type_label text,
  address text,
  address_alley text,
  address_road text,
  province_name_th text,
  district_name_th text,
  subdistrict_name_th text,
  postcode text,
  tel text,
  email text,
  opening_hours text,
  fee_th text,
  fee_th_kid text,
  fee_en text,
  fee_en_kid text,
  activity text,
  highlight text,
  reward text,
  suitable_duration text,
  market_limitation text,
  market_chance text,
  rule text,
  accessibility text,
  facilities_contact text,
  traveler_preparation text,
  website text,
  facebook text,
  instagram text,
  tiktok text,
  youtube text,
  line text,
  credit text,
  cash text,
  payment text,
  remark text,
  booking_detail text,
  source_att_id text,
  source_payload jsonb not null default '{}'::jsonb,
  updated_by_id uuid,
  updated_by_email text,
  updated_by_name text,
  updated_at timestamptz not null default now()
);

create index if not exists cultural_place_details_province_code_idx
  on public.cultural_place_details (province_code);

create index if not exists cultural_place_details_category_label_idx
  on public.cultural_place_details (category_label);

create index if not exists cultural_place_details_source_att_id_idx
  on public.cultural_place_details (source_att_id);

-- Optional, only enable after every place_id exists in public.cultural_places.
-- alter table public.cultural_place_details
--   add constraint cultural_place_details_place_id_fkey
--   foreign key (place_id) references public.cultural_places(id)
--   on delete cascade;
