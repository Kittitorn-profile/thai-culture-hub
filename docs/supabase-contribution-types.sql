begin;
alter table public.craft_data_overrides drop constraint if exists craft_data_overrides_record_id_check;
alter table public.craft_data_overrides add constraint craft_data_overrides_record_id_check check (record_id ~ '^(community|fabric|artists|heritage|ethnic|products):[a-zA-Z0-9_-]+$');
alter table public.craft_correction_requests drop constraint if exists craft_correction_requests_record_id_check;
alter table public.craft_correction_requests add constraint craft_correction_requests_record_id_check check (record_id ~ '^(community|fabric|artists|heritage|ethnic|products):[a-zA-Z0-9_-]+$');
notify pgrst, 'reload schema';
commit;
