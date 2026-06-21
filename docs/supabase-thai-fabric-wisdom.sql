create table if not exists public.thai_fabric_wisdom (
  id text primary key,
  fabric_id text,
  title text,
  type text,
  category text,
  description text,
  wisdom text,
  pattern text,
  material text,
  technique text,
  price text,
  producer text,
  community text,
  address text,
  sub_district text,
  district text,
  province text,
  province_code text,
  postcode text,
  latitude double precision,
  longitude double precision,
  contact_name text,
  contact_phone text,
  contact_email text,
  website text,
  facebook text,
  line text,
  image_url text,
  source_uri text,
  source_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.thai_fabric_wisdom
  add column if not exists price text;

create index if not exists thai_fabric_wisdom_fabric_id_idx
  on public.thai_fabric_wisdom (fabric_id);

create index if not exists thai_fabric_wisdom_title_idx
  on public.thai_fabric_wisdom (title);

create index if not exists thai_fabric_wisdom_province_code_idx
  on public.thai_fabric_wisdom (province_code);

create index if not exists thai_fabric_wisdom_province_idx
  on public.thai_fabric_wisdom (province);

create index if not exists thai_fabric_wisdom_category_idx
  on public.thai_fabric_wisdom (category);
