drop table if exists public.ethnic_groups;

create table public.ethnic_groups (
  ethnic_id integer unique,
  spatial text,
  title text not null,
  ip_group text,
  sub_district_th text,
  sub_district_en text,
  district_th text,
  district_en text,
  province text,
  province_en text,
  lat double precision,
  lng double precision,
  village_name_th text,
  village_name_en text,
  description_th text,
  description_en text,
  village_no text
);

create index if not exists ethnic_groups_spatial_idx
  on public.ethnic_groups (spatial);

create index if not exists ethnic_groups_ip_group_idx
  on public.ethnic_groups (ip_group);

create index if not exists ethnic_groups_province_idx
  on public.ethnic_groups (province);

create index if not exists ethnic_groups_district_th_idx
  on public.ethnic_groups (district_th);
