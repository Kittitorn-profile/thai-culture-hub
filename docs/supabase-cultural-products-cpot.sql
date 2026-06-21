create table if not exists public.cultural_products_cpot (
  id text primary key,
  cpot_id text,
  product_name text,
  category text,
  product_type text,
  description text,
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
  price text,
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

create index if not exists cultural_products_cpot_cpot_id_idx
  on public.cultural_products_cpot (cpot_id);

create index if not exists cultural_products_cpot_product_name_idx
  on public.cultural_products_cpot (product_name);

create index if not exists cultural_products_cpot_province_code_idx
  on public.cultural_products_cpot (province_code);

create index if not exists cultural_products_cpot_province_idx
  on public.cultural_products_cpot (province);

create index if not exists cultural_products_cpot_category_idx
  on public.cultural_products_cpot (category);
