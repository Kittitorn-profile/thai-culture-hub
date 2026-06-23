create extension if not exists pgcrypto;

create table if not exists public."user" (
  id uuid primary key default gen_random_uuid(),
  username text unique,
  email text unique,
  password_hash text not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_identity_required check (username is not null or email is not null)
);

create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public."user"(id) on delete cascade,
  email text not null,
  display_name text not null,
  bio text,
  phone text,
  province_code text,
  website_url text,
  facebook_url text,
  avatar_url text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_profiles_status_check check (status in ('pending', 'approved', 'rejected'))
);

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.creator_profiles'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.creator_profiles'::regclass
            and attname = 'user_id'
        )
      ]::smallint[]
  loop
    execute format('alter table public.creator_profiles drop constraint %I', constraint_record.conname);
  end loop;

  insert into public."user" (id, email, password_hash, role, is_active, created_at, updated_at)
  select
    creator_profiles.user_id,
    creator_profiles.email,
    'sha256:' || encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'),
    'creator',
    creator_profiles.status = 'approved',
    creator_profiles.created_at,
    creator_profiles.updated_at
  from public.creator_profiles
  where not exists (
    select 1
    from public."user"
    where public."user".id = creator_profiles.user_id
  )
  on conflict (id) do nothing;

  alter table public.creator_profiles
    add constraint creator_profiles_user_id_fkey
    foreign key (user_id) references public."user"(id) on delete cascade;
end $$;

create table if not exists public.creator_articles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  category_key text,
  category_label text,
  title text not null,
  slug text not null unique,
  excerpt text,
  cover_image_url text,
  content_html text not null default '',
  status text not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reject_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_articles_status_check check (
    status in ('draft', 'pending_review', 'approved', 'rejected', 'published')
  )
);

create index if not exists creator_profiles_status_idx
  on public.creator_profiles (status, created_at desc);

alter table public.creator_profiles
  add column if not exists province_code text;

create index if not exists creator_profiles_province_code_idx
  on public.creator_profiles (province_code);

create index if not exists creator_articles_creator_status_idx
  on public.creator_articles (creator_id, status, updated_at desc);

create index if not exists creator_articles_status_idx
  on public.creator_articles (status, submitted_at desc nulls last, updated_at desc);

alter table public.creator_articles
  add column if not exists category_key text,
  add column if not exists category_label text;

create index if not exists creator_articles_category_idx
  on public.creator_articles (category_key, status, updated_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists creator_profiles_set_updated_at on public.creator_profiles;
create trigger creator_profiles_set_updated_at
before update on public.creator_profiles
for each row execute function public.set_updated_at();

drop trigger if exists creator_articles_set_updated_at on public.creator_articles;
create trigger creator_articles_set_updated_at
before update on public.creator_articles
for each row execute function public.set_updated_at();
