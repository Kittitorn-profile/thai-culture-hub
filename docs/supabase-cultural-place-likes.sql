-- Province place likes for Thailand Cultural Hub
-- Run this in Supabase SQL editor before enabling the heart button.

create extension if not exists pgcrypto;

create table if not exists public.cultural_place_likes (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  ip_hash text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (place_id, ip_hash)
);

create index if not exists cultural_place_likes_place_id_idx
  on public.cultural_place_likes (place_id);

create index if not exists cultural_place_likes_created_at_idx
  on public.cultural_place_likes (created_at desc);

alter table public.cultural_place_likes enable row level security;
