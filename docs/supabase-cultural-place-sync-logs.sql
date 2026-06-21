create extension if not exists pgcrypto;

create table if not exists public.cultural_place_sync_logs (
  id uuid primary key default gen_random_uuid(),
  sync_dataset text not null,
  source_label text not null,
  province_code text,
  province_name text,
  total_records integer not null default 0,
  success boolean not null default false,
  message text,
  response_payload jsonb not null default '{}'::jsonb,
  synced_by_id uuid,
  synced_by_email text,
  synced_by_name text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists cultural_place_sync_logs_dataset_idx
  on public.cultural_place_sync_logs (sync_dataset);

create index if not exists cultural_place_sync_logs_province_code_idx
  on public.cultural_place_sync_logs (province_code);

create index if not exists cultural_place_sync_logs_synced_at_idx
  on public.cultural_place_sync_logs (synced_at desc);

create index if not exists cultural_place_sync_logs_dataset_province_synced_at_idx
  on public.cultural_place_sync_logs (sync_dataset, province_code, synced_at desc);
