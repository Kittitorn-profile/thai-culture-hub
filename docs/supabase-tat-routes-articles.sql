create table if not exists public.tat_routes (
  id text primary key,
  route_id text,
  slug text,
  title text,
  description text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tat_route_places (
  id text primary key,
  route_id text not null,
  place_id text,
  title text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tat_article_types (
  id text primary key,
  type_id text,
  slug text,
  title text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tat_articles (
  id text primary key,
  article_id text,
  slug text,
  title text,
  type_id text,
  type_slug text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists tat_routes_route_id_idx
  on public.tat_routes (route_id);

create index if not exists tat_routes_slug_idx
  on public.tat_routes (slug);

create index if not exists tat_route_places_route_id_idx
  on public.tat_route_places (route_id);

create index if not exists tat_route_places_place_id_idx
  on public.tat_route_places (place_id);

create index if not exists tat_article_types_type_id_idx
  on public.tat_article_types (type_id);

create index if not exists tat_article_types_slug_idx
  on public.tat_article_types (slug);

create index if not exists tat_articles_article_id_idx
  on public.tat_articles (article_id);

create index if not exists tat_articles_slug_idx
  on public.tat_articles (slug);

create index if not exists tat_articles_type_id_idx
  on public.tat_articles (type_id);
