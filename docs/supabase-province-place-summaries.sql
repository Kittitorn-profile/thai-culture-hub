create table if not exists public.province_place_summaries (
  province_code text primary key,
  province_name text not null,
  counts jsonb not null default '{}'::jsonb,
  dominant_category text not null default '',
  total integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.province_place_summaries
  add column if not exists province_name text not null default '';

alter table public.province_place_summaries
  add column if not exists counts jsonb not null default '{}'::jsonb;

alter table public.province_place_summaries
  add column if not exists dominant_category text not null default '';

alter table public.province_place_summaries
  add column if not exists total integer not null default 0;

alter table public.province_place_summaries
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.province_place_summaries
  add column if not exists refreshed_at timestamptz not null default now();

alter table public.province_place_summaries
  add column if not exists created_at timestamptz not null default now();

alter table public.province_place_summaries
  add column if not exists updated_at timestamptz not null default now();

create index if not exists province_place_summaries_total_idx
  on public.province_place_summaries (total desc);

create index if not exists province_place_summaries_dominant_category_idx
  on public.province_place_summaries (dominant_category);

