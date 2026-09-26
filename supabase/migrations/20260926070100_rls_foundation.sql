-- Phase 1: RLS helpers, policies and grants.
-- Business authorization remains deny-by-default for Phase 2+ mutations not yet specified here.

alter table public.tai_khoan enable row level security;
alter table public.vai_tro enable row level security;
alter table public.quyen enable row level security;
alter table public.phan_cong_vai_tro enable row level security;
alter table public.phan_quyen_vai_tro enable row level security;
alter table public.khach_hang enable row level security;
alter table public.hoat_dong enable row level security;
alter table public.thong_bao enable row level security;
alter table public.thong_bao_nguoi_nhan enable row level security;

create or replace function public.has_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.phan_cong_vai_tro pc
    join public.vai_tro vt on vt.id = pc.vai_tro_id
    where pc.tai_khoan_id = auth.uid()
      and vt.ma_vai_tro = role_code
  );
$$;

create or replace function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.phan_cong_vai_tro pc
    join public.phan_quyen_vai_tro pq on pq.vai_tro_id = pc.vai_tro_id
    join public.quyen q on q.id = pq.quyen_id
    where pc.tai_khoan_id = auth.uid()
      and q.ma_quyen = permission_code
  );
$$;

create or replace function public.is_in_subtree(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with recursive descendants(id) as (
    select tk.id
    from public.tai_khoan tk
    where tk.manager_id = auth.uid()

    union

    select child.id
    from public.tai_khoan child
    join descendants d on child.manager_id = d.id
  )
  select target_account_id = auth.uid()
    or exists (select 1 from descendants d where d.id = target_account_id);
$$;

create or replace function public.can_view_activity(activity_owner_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select activity_owner_id = auth.uid()
    or (
      public.has_permission('ACTIVITY_VIEW_SUBTREE')
      and public.is_in_subtree(activity_owner_id)
    );
$$;

revoke all on function public.has_role(text) from public;
revoke all on function public.has_permission(text) from public;
revoke all on function public.is_in_subtree(uuid) from public;
revoke all on function public.can_view_activity(uuid) from public;

grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_in_subtree(uuid) to authenticated;
grant execute on function public.can_view_activity(uuid) to authenticated;

-- Account profile/hierarchy reads. Mutations remain deferred to Auth/Admin phases.
create policy tai_khoan_select_scope
on public.tai_khoan
for select
to authenticated
using (
  id = auth.uid()
  or public.has_role('ADMIN')
  or (
    (public.has_role('DM') or public.has_role('UM'))
    and public.is_in_subtree(id)
  )
);

-- Role catalog is readable after authentication; only ADMIN can mutate it.
create policy vai_tro_select_authenticated
on public.vai_tro
for select
to authenticated
using (true);

create policy vai_tro_insert_admin
on public.vai_tro
for insert
to authenticated
with check (public.has_role('ADMIN'));

create policy vai_tro_update_admin
on public.vai_tro
for update
to authenticated
using (public.has_role('ADMIN'))
with check (public.has_role('ADMIN'));

create policy vai_tro_delete_admin
on public.vai_tro
for delete
to authenticated
using (public.has_role('ADMIN'));

create policy quyen_select_authenticated
on public.quyen
for select
to authenticated
using (true);

create policy quyen_insert_admin
on public.quyen
for insert
to authenticated
with check (public.has_role('ADMIN'));

create policy quyen_update_admin
on public.quyen
for update
to authenticated
using (public.has_role('ADMIN'))
with check (public.has_role('ADMIN'));

create policy quyen_delete_admin
on public.quyen
for delete
to authenticated
using (public.has_role('ADMIN'));

create policy phan_cong_vai_tro_select_scope
on public.phan_cong_vai_tro
for select
to authenticated
using (tai_khoan_id = auth.uid() or public.has_role('ADMIN'));

create policy phan_cong_vai_tro_insert_admin
on public.phan_cong_vai_tro
for insert
to authenticated
with check (public.has_role('ADMIN'));

create policy phan_cong_vai_tro_update_admin
on public.phan_cong_vai_tro
for update
to authenticated
using (public.has_role('ADMIN'))
with check (public.has_role('ADMIN'));

create policy phan_cong_vai_tro_delete_admin
on public.phan_cong_vai_tro
for delete
to authenticated
using (public.has_role('ADMIN'));

create policy phan_quyen_vai_tro_select_authenticated
on public.phan_quyen_vai_tro
for select
to authenticated
using (true);

create policy phan_quyen_vai_tro_insert_admin
on public.phan_quyen_vai_tro
for insert
to authenticated
with check (public.has_role('ADMIN'));

create policy phan_quyen_vai_tro_update_admin
on public.phan_quyen_vai_tro
for update
to authenticated
using (public.has_role('ADMIN'))
with check (public.has_role('ADMIN'));

create policy phan_quyen_vai_tro_delete_admin
on public.phan_quyen_vai_tro
for delete
to authenticated
using (public.has_role('ADMIN'));

-- Customer ownership is strict. ADMIN receives no ownership bypass policy.
create policy khach_hang_select_owner
on public.khach_hang
for select
to authenticated
using (chu_so_huu_id = auth.uid());

create policy khach_hang_insert_owner
on public.khach_hang
for insert
to authenticated
with check (chu_so_huu_id = auth.uid());

create policy khach_hang_update_owner
on public.khach_hang
for update
to authenticated
using (chu_so_huu_id = auth.uid())
with check (chu_so_huu_id = auth.uid());

create policy khach_hang_delete_owner
on public.khach_hang
for delete
to authenticated
using (chu_so_huu_id = auth.uid());

-- Activity: own mutations only; subtree reads require the mapped capability.
create policy hoat_dong_select_scope
on public.hoat_dong
for select
to authenticated
using (public.can_view_activity(tai_khoan_id));

create policy hoat_dong_insert_own
on public.hoat_dong
for insert
to authenticated
with check (tai_khoan_id = auth.uid());

create policy hoat_dong_update_own
on public.hoat_dong
for update
to authenticated
using (tai_khoan_id = auth.uid())
with check (tai_khoan_id = auth.uid());

create policy hoat_dong_delete_own
on public.hoat_dong
for delete
to authenticated
using (tai_khoan_id = auth.uid());

-- Notification creation/update/delete is Phase 6. Phase 1 only establishes safe reads.
create policy thong_bao_select_creator_or_recipient
on public.thong_bao
for select
to authenticated
using (
  nguoi_tao_id = auth.uid()
  or exists (
    select 1
    from public.thong_bao_nguoi_nhan tbn
    where tbn.thong_bao_id = thong_bao.id
      and tbn.tai_khoan_id = auth.uid()
  )
);

create policy thong_bao_nguoi_nhan_select_own
on public.thong_bao_nguoi_nhan
for select
to authenticated
using (tai_khoan_id = auth.uid());

create policy thong_bao_nguoi_nhan_update_own
on public.thong_bao_nguoi_nhan
for update
to authenticated
using (tai_khoan_id = auth.uid())
with check (tai_khoan_id = auth.uid());

-- Pair table privileges with RLS. Anonymous access is denied for Phase 1 data.
revoke all on table public.tai_khoan from anon, authenticated;
revoke all on table public.vai_tro from anon, authenticated;
revoke all on table public.quyen from anon, authenticated;
revoke all on table public.phan_cong_vai_tro from anon, authenticated;
revoke all on table public.phan_quyen_vai_tro from anon, authenticated;
revoke all on table public.khach_hang from anon, authenticated;
revoke all on table public.hoat_dong from anon, authenticated;
revoke all on table public.thong_bao from anon, authenticated;
revoke all on table public.thong_bao_nguoi_nhan from anon, authenticated;

grant select on table public.tai_khoan to authenticated;
grant select, insert, update, delete on table public.vai_tro to authenticated;
grant select, insert, update, delete on table public.quyen to authenticated;
grant select, insert, update, delete on table public.phan_cong_vai_tro to authenticated;
grant select, insert, update, delete on table public.phan_quyen_vai_tro to authenticated;
grant select, insert, update, delete on table public.khach_hang to authenticated;
grant select, insert, update, delete on table public.hoat_dong to authenticated;
grant select on table public.thong_bao to authenticated;
grant select on table public.thong_bao_nguoi_nhan to authenticated;
grant update (da_doc) on table public.thong_bao_nguoi_nhan to authenticated;
