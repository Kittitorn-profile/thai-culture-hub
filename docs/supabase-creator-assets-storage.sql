-- Supabase Storage bucket for Creator uploaded assets.
-- Run this in Supabase SQL Editor before using /creator/profile avatar uploads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-assets',
  'creator-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
