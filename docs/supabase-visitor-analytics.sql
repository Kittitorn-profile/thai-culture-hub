-- Website analytics for Thailand Cultural Hub
-- Run this in Supabase SQL editor before enabling the analytics dashboard.

create extension if not exists pgcrypto;

create table if not exists public.visitor_page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  title text,
  referrer text,
  visitor_id text not null,
  session_id text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists visitor_page_views_created_at_idx
  on public.visitor_page_views (created_at desc);

create index if not exists visitor_page_views_path_idx
  on public.visitor_page_views (path);

create index if not exists visitor_page_views_visitor_id_idx
  on public.visitor_page_views (visitor_id);

create index if not exists visitor_page_views_session_id_idx
  on public.visitor_page_views (session_id);

create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_name text not null,
  path text not null,
  metadata jsonb not null default '{}'::jsonb,
  visitor_id text not null,
  session_id text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists visitor_events_created_at_idx
  on public.visitor_events (created_at desc);

create index if not exists visitor_events_event_type_idx
  on public.visitor_events (event_type);

create index if not exists visitor_events_event_name_idx
  on public.visitor_events (event_name);

create index if not exists visitor_events_metadata_gin_idx
  on public.visitor_events using gin (metadata);
