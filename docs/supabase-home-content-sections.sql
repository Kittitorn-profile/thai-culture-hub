create table if not exists public.home_content_sections (
  section_key text primary key,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_content_sections
  add column if not exists created_at timestamptz not null default now();

alter table public.home_content_sections
  add column if not exists updated_at timestamptz not null default now();

create index if not exists home_content_sections_updated_at_idx
  on public.home_content_sections (updated_at desc);

