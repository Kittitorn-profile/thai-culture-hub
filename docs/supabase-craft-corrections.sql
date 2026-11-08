begin;
create table if not exists public.craft_data_overrides (
  record_id text primary key check (record_id ~ '^(community|fabric|artists|heritage|ethnic|products):[a-zA-Z0-9_-]+$'),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null
);
create table if not exists public.craft_correction_requests (
  id uuid primary key default gen_random_uuid(),
  record_id text not null check (record_id ~ '^(community|fabric|artists|heritage|ethnic|products):[a-zA-Z0-9_-]+$'),
  record_title text not null,
  requester_user_id text not null,
  requester_name text not null,
  reason text not null,
  original_snapshot jsonb not null,
  suggested_payload jsonb not null,
  base_revision timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text not null default '',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists craft_correction_requests_owner_idx on public.craft_correction_requests (requester_user_id, created_at desc);
create index if not exists craft_correction_requests_status_idx on public.craft_correction_requests (status, created_at desc);
alter table public.craft_data_overrides enable row level security;
alter table public.craft_correction_requests enable row level security;
revoke all on public.craft_data_overrides, public.craft_correction_requests from anon, authenticated;
grant select, insert, update on public.craft_data_overrides, public.craft_correction_requests to service_role;
create or replace function public.review_craft_correction(request_id uuid, decision text, reviewer_id text, reviewer_note text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare req public.craft_correction_requests; current_revision timestamptz;
begin
  if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into req from public.craft_correction_requests where id = request_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  if req.status <> 'pending' then raise exception 'Request already reviewed' using errcode = '40001'; end if;
  if decision = 'approved' then
    perform pg_advisory_xact_lock(hashtextextended(req.record_id, 0));
    select updated_at into current_revision from public.craft_data_overrides where record_id = req.record_id;
    if current_revision is distinct from req.base_revision then
      raise exception 'ข้อมูลรายการนี้เปลี่ยนแปลงแล้ว กรุณาตรวจข้อมูลล่าสุดก่อนอนุมัติ' using errcode = '40001';
    end if;
    insert into public.craft_data_overrides(record_id,payload,updated_at,updated_by)
      values(req.record_id,req.suggested_payload,now(),reviewer_id)
      on conflict(record_id) do update set payload = craft_data_overrides.payload || excluded.payload,
        updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  end if;
  update public.craft_correction_requests set status = decision, review_note = coalesce(reviewer_note,''),
    reviewed_by = reviewer_id, reviewed_at = now() where id = request_id;
  return jsonb_build_object('id',request_id,'status',decision);
end $$;
revoke all on function public.review_craft_correction(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.review_craft_correction(uuid,text,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
