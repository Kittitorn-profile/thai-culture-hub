create extension if not exists pgcrypto;

create table if not exists public.popup_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  image_url text not null,
  button_label text,
  button_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  dismissible boolean not null default true,
  show_once boolean not null default true,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.popup_banners
  alter column title drop not null;

alter table public.popup_banners
  add column if not exists description text;

alter table public.popup_banners
  add column if not exists image_url text;

alter table public.popup_banners
  add column if not exists button_label text;

alter table public.popup_banners
  add column if not exists button_url text;

alter table public.popup_banners
  add column if not exists sort_order integer not null default 0;

alter table public.popup_banners
  add column if not exists is_active boolean not null default true;

alter table public.popup_banners
  add column if not exists dismissible boolean not null default true;

alter table public.popup_banners
  add column if not exists show_once boolean not null default true;

alter table public.popup_banners
  add column if not exists starts_at timestamptz;

alter table public.popup_banners
  add column if not exists ends_at timestamptz;

alter table public.popup_banners
  add column if not exists created_at timestamptz not null default now();

alter table public.popup_banners
  add column if not exists updated_at timestamptz not null default now();

create index if not exists popup_banners_active_schedule_idx
  on public.popup_banners (is_active, starts_at, ends_at, sort_order, created_at desc);
