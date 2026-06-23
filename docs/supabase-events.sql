create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  time_label text,
  province_code text,
  province_name text,
  location text,
  organizer text,
  media_url text,
  cover_url text,
  media_type text not null default 'image',
  source_label text,
  source_url text,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  source text not null default 'manual',
  source_event_id text,
  source_payload jsonb not null default '{}'::jsonb,
  detail_payload jsonb not null default '{}'::jsonb,
  tat_event_id text,
  tat_name text,
  tat_slug text,
  tat_status text,
  tat_start_date timestamptz,
  tat_end_date timestamptz,
  tat_start_time text,
  tat_end_time text,
  tat_location_name text,
  tat_address text,
  tat_province_name text,
  tat_lat numeric,
  tat_lng numeric,
  tat_thumbnail_url text,
  tat_image_urls text[] not null default array[]::text[],
  tat_contact jsonb not null default '{}'::jsonb,
  tat_url text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_media_type_check check (media_type in ('image', 'video'))
);

alter table public.events
  add column if not exists title text;

alter table public.events
  add column if not exists description text;

alter table public.events
  add column if not exists starts_at timestamptz;

alter table public.events
  alter column starts_at drop not null;

alter table public.events
  add column if not exists ends_at timestamptz;

alter table public.events
  add column if not exists time_label text;

alter table public.events
  add column if not exists province_code text;

alter table public.events
  alter column province_code drop not null;

alter table public.events
  add column if not exists province_name text;

alter table public.events
  alter column province_name drop not null;

alter table public.events
  add column if not exists location text;

alter table public.events
  alter column location drop not null;

alter table public.events
  add column if not exists organizer text;

alter table public.events
  alter column organizer drop not null;

alter table public.events
  add column if not exists media_url text;

alter table public.events
  add column if not exists cover_url text;

alter table public.events
  add column if not exists media_type text not null default 'image';

alter table public.events
  add column if not exists source_label text;

alter table public.events
  add column if not exists source_url text;

alter table public.events
  add column if not exists is_featured boolean not null default false;

alter table public.events
  add column if not exists sort_order integer not null default 0;

alter table public.events
  add column if not exists is_active boolean not null default true;

alter table public.events
  add column if not exists source text not null default 'manual';

alter table public.events
  add column if not exists source_event_id text;

alter table public.events
  add column if not exists source_payload jsonb not null default '{}'::jsonb;

alter table public.events
  add column if not exists detail_payload jsonb not null default '{}'::jsonb;

alter table public.events
  add column if not exists tat_event_id text;

alter table public.events
  add column if not exists tat_name text;

alter table public.events
  add column if not exists tat_slug text;

alter table public.events
  add column if not exists tat_status text;

alter table public.events
  add column if not exists tat_start_date timestamptz;

alter table public.events
  add column if not exists tat_end_date timestamptz;

alter table public.events
  add column if not exists tat_start_time text;

alter table public.events
  add column if not exists tat_end_time text;

alter table public.events
  add column if not exists tat_location_name text;

alter table public.events
  add column if not exists tat_address text;

alter table public.events
  add column if not exists tat_province_name text;

alter table public.events
  add column if not exists tat_lat numeric;

alter table public.events
  add column if not exists tat_lng numeric;

alter table public.events
  add column if not exists tat_thumbnail_url text;

alter table public.events
  add column if not exists tat_image_urls text[] not null default array[]::text[];

alter table public.events
  add column if not exists tat_contact jsonb not null default '{}'::jsonb;

alter table public.events
  add column if not exists tat_url text;

alter table public.events
  add column if not exists synced_at timestamptz;

alter table public.events
  add column if not exists created_at timestamptz not null default now();

alter table public.events
  add column if not exists updated_at timestamptz not null default now();

create index if not exists events_active_schedule_idx
  on public.events (is_active, starts_at, sort_order, created_at desc);

create index if not exists events_active_featured_schedule_idx
  on public.events (is_active, is_featured desc, starts_at, sort_order, created_at desc);

create index if not exists events_province_code_idx
  on public.events (province_code);

create index if not exists events_updated_at_idx
  on public.events (updated_at desc);

create unique index if not exists events_source_event_id_uidx
  on public.events (source, source_event_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();
