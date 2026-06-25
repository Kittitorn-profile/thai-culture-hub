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
  warning_note text,
  warned_at timestamptz,
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
  is_active boolean not null default true,
  inactive_reason text,
  inactivated_at timestamptz,
  approval_required_count integer not null default 1,
  approval_reviewer_ids uuid[] not null default '{}',
  approval_reviews jsonb not null default '[]'::jsonb,
  approval_requested_at timestamptz,
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
  add column if not exists province_code text,
  add column if not exists warning_note text,
  add column if not exists warned_at timestamptz;

create index if not exists creator_profiles_province_code_idx
  on public.creator_profiles (province_code);

create table if not exists public.creator_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.creator_settings
  add column if not exists value jsonb not null default '{}'::jsonb,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

insert into public.creator_settings (key, value)
values (
  'default',
  '{
    "badgeImages": {
      "qualityContributor": "",
      "reliableContributor": "",
      "topContributor": "",
      "textileSpecialist": "",
      "festivalSpecialist": "",
      "ethnicCultureSpecialist": "",
      "localFoodSpecialist": "",
      "wisdomKeeper": ""
    },
    "levelThresholds": {
      "qualityMinPublishedArticles": 1,
      "qualityMinQualityScore": 70,
      "qualityMinTotalViews": 100,
      "reliableMinPublishedArticles": 5,
      "reliableMinQualityScore": 82,
      "reliableMinTotalViews": 800,
      "topMinPublishedArticles": 15,
      "topMinQualityScore": 90,
      "topMinTotalViews": 3000
    },
    "specialtyBadges": {
      "textileMinArticles": 3,
      "textileMinQualityScore": 75,
      "festivalMinArticles": 3,
      "festivalMinQualityScore": 75,
      "ethnicCultureMinArticles": 3,
      "ethnicCultureMinQualityScore": 75,
      "localFoodMinArticles": 3,
      "localFoodMinQualityScore": 75,
      "wisdomMinArticles": 3,
      "wisdomMinQualityScore": 75
    },
    "scoringWeights": {
      "publishedArticles": 35,
      "articleQualityScore": 35,
      "engagementScore": 20,
      "profileCompleteness": 10
    },
    "creatorPolicy": {
      "autoLevelEnabled": false,
      "requireApprovedProfile": true,
      "requireActiveAccount": true,
      "minScoreToShowBadge": 70,
      "inactiveWarningDays": 45,
      "publicBadgeMinLevel": "quality"
    }
  }'::jsonb
)
on conflict (key) do nothing;

create index if not exists creator_articles_creator_status_idx
  on public.creator_articles (creator_id, status, updated_at desc);

create index if not exists creator_articles_status_idx
  on public.creator_articles (status, submitted_at desc nulls last, updated_at desc);

alter table public.creator_articles
  add column if not exists category_key text,
  add column if not exists category_label text,
  add column if not exists is_active boolean not null default true,
  add column if not exists inactive_reason text,
  add column if not exists inactivated_at timestamptz,
  add column if not exists approval_required_count integer not null default 1,
  add column if not exists approval_reviewer_ids uuid[] not null default '{}',
  add column if not exists approval_reviews jsonb not null default '[]'::jsonb,
  add column if not exists approval_requested_at timestamptz;

create index if not exists creator_articles_category_idx
  on public.creator_articles (category_key, status, updated_at desc);

create index if not exists creator_articles_public_idx
  on public.creator_articles (is_active, status, published_at desc nulls last, updated_at desc);

create table if not exists public.creator_article_review_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.creator_article_review_settings
  add column if not exists value jsonb not null default '{}'::jsonb,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

insert into public.creator_article_review_settings (key, value)
values (
  'default',
  '{
    "scoreThresholds": {
      "approveMinScore": 70,
      "publishMinScore": 85,
      "rejectBelowScore": 50
    },
    "scoreWeights": {
      "title": 15,
      "coverImage": 15,
      "source": 20,
      "category": 10,
      "excerpt": 15,
      "contentLength": 25
    },
    "reviewPolicy": {
      "requireScoreBeforeApprove": true,
      "requireSourceForPublish": true,
      "minimumWordCount": 300,
      "maximumMinorIssueCount": 3
    }
  }'::jsonb
)
on conflict (key) do nothing;

create table if not exists public.reviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  avatar_url text,
  reviewer_level text not null default 'junior',
  reviewer_status text not null default 'pending',
  expertise_categories text[] not null default '{}',
  expertise_regions text[] not null default '{}',
  expertise_provinces text[] not null default '{}',
  organization text,
  position text,
  credentials text,
  proof_urls text[] not null default '{}',
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  review_count integer not null default 0,
  approved_count integer not null default 0,
  rejected_count integer not null default 0,
  accuracy_score numeric(5,2) not null default 0,
  trust_score numeric(5,2) not null default 0,
  can_review_categories text[] not null default '{}',
  can_review_regions text[] not null default '{}',
  can_approve boolean not null default false,
  can_publish boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviewers_level_check check (reviewer_level in ('junior', 'senior', 'expert')),
  constraint reviewers_status_check check (reviewer_status in ('pending', 'verified', 'suspended', 'rejected'))
);

alter table public.reviewers
  add column if not exists user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists reviewer_level text not null default 'junior',
  add column if not exists reviewer_status text not null default 'pending',
  add column if not exists expertise_categories text[] not null default '{}',
  add column if not exists expertise_regions text[] not null default '{}',
  add column if not exists expertise_provinces text[] not null default '{}',
  add column if not exists organization text,
  add column if not exists position text,
  add column if not exists credentials text,
  add column if not exists proof_urls text[] not null default '{}',
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists review_count integer not null default 0,
  add column if not exists approved_count integer not null default 0,
  add column if not exists rejected_count integer not null default 0,
  add column if not exists accuracy_score numeric(5,2) not null default 0,
  add column if not exists trust_score numeric(5,2) not null default 0,
  add column if not exists can_review_categories text[] not null default '{}',
  add column if not exists can_review_regions text[] not null default '{}',
  add column if not exists can_approve boolean not null default false,
  add column if not exists can_publish boolean not null default false,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists reviewers_user_id_idx
  on public.reviewers (user_id);

create index if not exists reviewers_status_idx
  on public.reviewers (reviewer_status, created_at desc);

create table if not exists public.reviewer_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.reviewer_settings
  add column if not exists value jsonb not null default '{}'::jsonb,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

insert into public.reviewer_settings (key, value)
values (
  'default',
  '{
    "levelThresholds": {
      "seniorMinTrustScore": 70,
      "seniorMinAccuracyScore": 75,
      "seniorMinReviewCount": 20,
      "expertMinTrustScore": 88,
      "expertMinAccuracyScore": 90,
      "expertMinReviewCount": 75
    },
    "scoringWeights": {
      "trustScore": 40,
      "accuracyScore": 35,
      "approvalConsistency": 15,
      "reviewVolume": 10
    },
    "reviewPolicy": {
      "autoLevelEnabled": false,
      "requireProofUrls": true,
      "minVerifiedReviewsForPublish": 10,
      "allowPublishMinLevel": "senior",
      "lowTrustWarningScore": 55,
      "staleReviewDays": 30
    }
  }'::jsonb
)
on conflict (key) do nothing;

create table if not exists public.creator_article_likes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.creator_articles(id) on delete cascade,
  ip_hash text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (article_id, ip_hash)
);

create index if not exists creator_article_likes_article_id_idx
  on public.creator_article_likes (article_id);

create index if not exists creator_article_likes_created_at_idx
  on public.creator_article_likes (created_at desc);

alter table public.creator_article_likes enable row level security;

create table if not exists public.creator_article_views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.creator_articles(id) on delete cascade,
  ip_hash text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (article_id, ip_hash)
);

create index if not exists creator_article_views_article_id_idx
  on public.creator_article_views (article_id);

create index if not exists creator_article_views_created_at_idx
  on public.creator_article_views (created_at desc);

alter table public.creator_article_views enable row level security;

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

drop trigger if exists reviewers_set_updated_at on public.reviewers;
create trigger reviewers_set_updated_at
before update on public.reviewers
for each row execute function public.set_updated_at();
