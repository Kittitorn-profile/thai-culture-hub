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

create table if not exists public.cultural_place_correction_requests (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  province_code text,
  place_name text,
  creator_profile_id uuid references public.creator_profiles(id) on delete set null,
  requester_user_id uuid references public."user"(id) on delete set null,
  requester_email text,
  requester_name text,
  reason text not null default '',
  original_snapshot jsonb not null default '{}'::jsonb,
  suggested_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_email text,
  reviewer_name text,
  review_note text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cultural_place_correction_requests_status_check check (
    status in ('pending', 'approved', 'rejected')
  )
);

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.cultural_place_correction_requests'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.cultural_place_correction_requests'::regclass
            and attname = 'requester_user_id'
        )
      ]::smallint[]
  loop
    execute format(
      'alter table public.cultural_place_correction_requests drop constraint %I',
      constraint_record.conname
    );
  end loop;

  update public.cultural_place_correction_requests
  set requester_user_id = creator_profiles.user_id
  from public.creator_profiles
  where cultural_place_correction_requests.creator_profile_id = creator_profiles.id
    and cultural_place_correction_requests.requester_user_id is distinct from creator_profiles.user_id;

  update public.cultural_place_correction_requests
  set requester_user_id = null
  where requester_user_id is not null
    and not exists (
      select 1
      from public."user"
      where public."user".id = cultural_place_correction_requests.requester_user_id
    );

  alter table public.cultural_place_correction_requests
    add constraint cultural_place_correction_requests_requester_user_id_fkey
    foreign key (requester_user_id) references public."user"(id) on delete set null;
end $$;

create index if not exists cultural_place_correction_requests_place_idx
  on public.cultural_place_correction_requests (place_id, created_at desc);

create index if not exists cultural_place_correction_requests_status_idx
  on public.cultural_place_correction_requests (status, created_at desc);

create index if not exists cultural_place_correction_requests_creator_idx
  on public.cultural_place_correction_requests (creator_profile_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cultural_place_correction_requests_set_updated_at
  on public.cultural_place_correction_requests;
create trigger cultural_place_correction_requests_set_updated_at
before update on public.cultural_place_correction_requests
for each row execute function public.set_updated_at();
