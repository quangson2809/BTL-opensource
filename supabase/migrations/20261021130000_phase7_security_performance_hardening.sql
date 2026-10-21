-- Phase 7 hardening: keep SECURITY DEFINER policy helpers outside the exposed public schema.
-- IMPORTANT: keep app_private out of Supabase Data API exposed schemas.
-- The wrappers deliberately preserve existing authorization predicates while preventing
-- direct /rest/v1/rpc access to generic helpers that accept arbitrary role/account IDs.

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.current_account_has_application_access()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_account_has_application_access();
$$;

create or replace function app_private.has_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_role(role_code);
$$;

create or replace function app_private.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_permission(permission_code);
$$;

create or replace function app_private.is_in_subtree(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_in_subtree(target_account_id);
$$;

create or replace function app_private.can_view_activity(activity_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.can_view_activity(activity_owner_id);
$$;

create or replace function app_private.can_creator_read_notification_recipient(target_notification_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.can_creator_read_notification_recipient(target_notification_id);
$$;

create or replace function app_private.can_recipient_read_sent_notification(
  target_notification_id uuid,
  target_account_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.can_recipient_read_sent_notification(target_notification_id, target_account_id);
$$;

revoke all on function app_private.current_account_has_application_access() from public, anon;
revoke all on function app_private.has_role(text) from public, anon;
revoke all on function app_private.has_permission(text) from public, anon;
revoke all on function app_private.is_in_subtree(uuid) from public, anon;
revoke all on function app_private.can_view_activity(uuid) from public, anon;
revoke all on function app_private.can_creator_read_notification_recipient(uuid) from public, anon;
revoke all on function app_private.can_recipient_read_sent_notification(uuid, uuid) from public, anon;

grant execute on function app_private.current_account_has_application_access() to authenticated, service_role;
grant execute on function app_private.has_role(text) to authenticated, service_role;
grant execute on function app_private.has_permission(text) to authenticated, service_role;
grant execute on function app_private.is_in_subtree(uuid) to authenticated, service_role;
grant execute on function app_private.can_view_activity(uuid) to authenticated, service_role;
grant execute on function app_private.can_creator_read_notification_recipient(uuid) to authenticated, service_role;
grant execute on function app_private.can_recipient_read_sent_notification(uuid, uuid) to authenticated, service_role;

-- RLS policy helpers now resolve through the non-API schema. The public functions
-- remain for compatibility with SECURITY DEFINER business RPC bodies, which execute
-- as their owner; direct client execution is revoked below.
alter policy tai_khoan_application_access_gate on public.tai_khoan
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());
alter policy vai_tro_application_access_gate on public.vai_tro
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());
alter policy quyen_application_access_gate on public.quyen
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());
alter policy phan_cong_vai_tro_application_access_gate on public.phan_cong_vai_tro
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());
alter policy phan_quyen_vai_tro_application_access_gate on public.phan_quyen_vai_tro
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());
alter policy khach_hang_application_access_gate on public.khach_hang
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());
alter policy hoat_dong_application_access_gate on public.hoat_dong
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());
alter policy thong_bao_application_access_gate on public.thong_bao
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());
alter policy thong_bao_nguoi_nhan_application_access_gate on public.thong_bao_nguoi_nhan
  using (app_private.current_account_has_application_access())
  with check (app_private.current_account_has_application_access());

alter policy tai_khoan_select_scope on public.tai_khoan
  using (
    id = (select auth.uid())
    or app_private.has_role('ADMIN')
    or (
      (app_private.has_role('DM') or app_private.has_role('UM'))
      and app_private.is_in_subtree(id)
    )
  );

alter policy vai_tro_insert_admin on public.vai_tro
  with check (app_private.has_role('ADMIN'));
alter policy vai_tro_update_admin on public.vai_tro
  using (app_private.has_role('ADMIN'))
  with check (app_private.has_role('ADMIN'));
alter policy vai_tro_delete_admin on public.vai_tro
  using (app_private.has_role('ADMIN'));

alter policy quyen_insert_admin on public.quyen
  with check (app_private.has_role('ADMIN'));
alter policy quyen_update_admin on public.quyen
  using (app_private.has_role('ADMIN'))
  with check (app_private.has_role('ADMIN'));
alter policy quyen_delete_admin on public.quyen
  using (app_private.has_role('ADMIN'));

alter policy phan_cong_vai_tro_select_scope on public.phan_cong_vai_tro
  using (
    tai_khoan_id = (select auth.uid())
    or app_private.has_role('ADMIN')
  );
alter policy phan_cong_vai_tro_insert_admin on public.phan_cong_vai_tro
  with check (app_private.has_role('ADMIN'));
alter policy phan_cong_vai_tro_update_admin on public.phan_cong_vai_tro
  using (app_private.has_role('ADMIN'))
  with check (app_private.has_role('ADMIN'));
alter policy phan_cong_vai_tro_delete_admin on public.phan_cong_vai_tro
  using (app_private.has_role('ADMIN'));

alter policy phan_quyen_vai_tro_insert_admin on public.phan_quyen_vai_tro
  with check (app_private.has_role('ADMIN'));
alter policy phan_quyen_vai_tro_update_admin on public.phan_quyen_vai_tro
  using (app_private.has_role('ADMIN'))
  with check (app_private.has_role('ADMIN'));
alter policy phan_quyen_vai_tro_delete_admin on public.phan_quyen_vai_tro
  using (app_private.has_role('ADMIN'));

alter policy khach_hang_select_owner on public.khach_hang
  using (chu_so_huu_id = (select auth.uid()));
alter policy khach_hang_insert_owner on public.khach_hang
  with check (chu_so_huu_id = (select auth.uid()));
alter policy khach_hang_update_owner on public.khach_hang
  using (chu_so_huu_id = (select auth.uid()))
  with check (chu_so_huu_id = (select auth.uid()));
alter policy khach_hang_delete_owner on public.khach_hang
  using (chu_so_huu_id = (select auth.uid()));

alter policy hoat_dong_select_scope on public.hoat_dong
  using (app_private.can_view_activity(tai_khoan_id));
alter policy hoat_dong_insert_own on public.hoat_dong
  with check (tai_khoan_id = (select auth.uid()));
alter policy hoat_dong_update_own on public.hoat_dong
  using (tai_khoan_id = (select auth.uid()))
  with check (tai_khoan_id = (select auth.uid()));
alter policy hoat_dong_delete_own on public.hoat_dong
  using (tai_khoan_id = (select auth.uid()));

alter policy thong_bao_select_creator_or_sent_recipient on public.thong_bao
  using (
    nguoi_tao_id = (select auth.uid())
    or (
      trang_thai = 'ĐÃ_GỬI'
      and exists (
        select 1
        from public.thong_bao_nguoi_nhan tbn
        where tbn.thong_bao_id = thong_bao.id
          and tbn.tai_khoan_id = (select auth.uid())
      )
    )
  );

alter policy thong_bao_nguoi_nhan_select_scope on public.thong_bao_nguoi_nhan
  using (
    app_private.can_creator_read_notification_recipient(thong_bao_id)
    or app_private.can_recipient_read_sent_notification(thong_bao_id, tai_khoan_id)
  );
alter policy thong_bao_nguoi_nhan_update_sent_own on public.thong_bao_nguoi_nhan
  using (app_private.can_recipient_read_sent_notification(thong_bao_id, tai_khoan_id))
  with check (app_private.can_recipient_read_sent_notification(thong_bao_id, tai_khoan_id));

-- These generic helpers answer questions about arbitrary role codes, account IDs,
-- or notification IDs. User-facing business RPCs remain authenticated-only and
-- retain their own role/scope checks; these helpers are policy-internal.
revoke all on function public.current_account_has_application_access() from public, anon, authenticated;
revoke all on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated;
revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;
revoke all on function public.is_in_subtree(uuid) from public, anon;
grant execute on function public.is_in_subtree(uuid) to authenticated;
revoke all on function public.can_view_activity(uuid) from public, anon;
grant execute on function public.can_view_activity(uuid) to authenticated;
revoke all on function public.can_creator_read_notification_recipient(uuid) from public, anon, authenticated;
revoke all on function public.can_recipient_read_sent_notification(uuid, uuid) from public, anon, authenticated;

-- Support FK maintenance and remove per-row evaluation of auth.uid() in policies.
create index if not exists idx_phan_cong_vai_tro_nguoi_gan_id
  on public.phan_cong_vai_tro (nguoi_gan_id);
create index if not exists idx_phan_quyen_vai_tro_nguoi_gan_id
  on public.phan_quyen_vai_tro (nguoi_gan_id);
