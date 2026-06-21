create table if not exists public.cultural_categories (
  key text primary key,
  label text not null,
  color text not null default '#608D8C',
  icon text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cultural_categories_active_sort_idx
  on public.cultural_categories (is_active, sort_order);

-- Optional seed. Edit labels/colors freely in database.
insert into public.cultural_categories (key, label, color, sort_order)
values
  ('tourist_attraction', 'สถานที่ท่องเที่ยว', '#608D8C', 10),
  ('cultural_attraction', 'แหล่งท่องเที่ยวทางวัฒนธรรม', '#A45C2B', 20),
  ('temple', 'ศาสนสถาน', '#C89B3C', 30),
  ('museum', 'พิพิธภัณฑ์', '#5A6F8F', 40),
  ('learning_center', 'แหล่งเรียนรู้', '#3F6F8D', 50),
  ('local_food', 'อาหารพื้นบ้าน', '#D19F46', 60),
  ('performing_art', 'ศิลปะการแสดง', '#CE7B48', 70),
  ('local_tradition', 'ประเพณีท้องถิ่น', '#947488', 80),
  ('craftsmanship', 'งานช่างฝีมือ', '#5B7B91', 90),
  ('community_wisdom', 'ภูมิปัญญาชุมชน', '#7E9578', 100),
  ('folk_art', 'ศิลปะพื้นบ้าน', '#AB8395', 110),
  ('ritual', 'พิธีกรรม', '#B2865A', 120)
on conflict (key) do update
set
  label = excluded.label,
  color = excluded.color,
  sort_order = excluded.sort_order,
  updated_at = now();
