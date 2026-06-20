create table if not exists public.place_sub_categories (
  id integer primary key,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists place_sub_categories_name_idx
  on public.place_sub_categories (name);

-- Admin category metadata is stored in payload to keep a single category source table:
-- {
--   "description": "...",
--   "color": "#608D8C",
--   "icon": "solar:gallery-wide-bold",
--   "imageUrl": "/assets/...",
--   "sortOrder": 1,
--   "isActive": true
-- }
