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

create index if not exists user_is_active_idx
  on public."user" (is_active);

-- Example admin user.
-- Replace username/email/password before running.
insert into public."user" (username, email, password_hash, role)
values (
  'admin',
  'admin@example.com',
  'sha256:' || encode(digest('change-this-password', 'sha256'), 'hex'),
  'admin'
)
on conflict (username) do update
set
  email = excluded.email,
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = true,
  updated_at = now();
