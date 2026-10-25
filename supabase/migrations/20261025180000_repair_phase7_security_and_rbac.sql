-- Repair production drift for notification drafts, account lockout safeguards,
-- permission-based activity scope, and Phase 7 RLS/security hardening.
-- This forward migration is intentionally idempotent for an installation that
-- already applied some of the original migrations.
-- Consolidated repair source: supabase/migrations/20261017060000_notification_draft_management.sql
-- Draft-only notification management.
-- Sent notifications remain immutable: both RPCs lock and re-check the row state
-- before changing any notification or recipient rows.

create or replace function public.dm_update_notification_draft(
  target_notification_id uuid,
  notification_title text,
  notification_content text,
  notification_type text,
  recipient_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  recipient_id uuid;
begin
  if not public.has_role('DM') then
    raise exception using errcode = '42501', message = 'DM role required';
  end if;

  perform 1
  from public.thong_bao tb
  where tb.id = target_notification_id
    and tb.nguoi_tao_id = auth.uid()
    and tb.trang_thai = 'CHƯA_GỬI'
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Notification must be an owned draft';
  end if;

  if nullif(btrim(notification_title), '') is null
     or nullif(btrim(notification_content), '') is null
     or notification_type is null
     or notification_type not in ('TIN_TỨC', 'TỰ_ĐỘNG_HỆ_THỐNG') then
    raise exception using errcode = '22023', message = 'Invalid notification fields';
  end if;

  if recipient_ids is null
     or cardinality(recipient_ids) = 0
     or array_position(recipient_ids, null) is not null then
    raise exception using errcode = '22023', message = 'At least one valid recipient is required';
  end if;

  for recipient_id in
    select distinct candidate_id
    from unnest(recipient_ids) as recipient(candidate_id)
  loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient is outside DM scope';
    end if;
  end loop;

  update public.thong_bao
  set tieu_de = btrim(notification_title),
      noi_dung = btrim(notification_content),
      loai = notification_type,
      updated_at = now()
  where id = target_notification_id;

  delete from public.thong_bao_nguoi_nhan
  where thong_bao_id = target_notification_id;

  insert into public.thong_bao_nguoi_nhan (thong_bao_id, tai_khoan_id)
  select target_notification_id, recipient.scoped_recipient_id
  from (
    select distinct unnest(recipient_ids) as scoped_recipient_id
  ) recipient;
end;
$$;

create or replace function public.dm_delete_notification_draft(
  target_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role('DM') then
    raise exception using errcode = '42501', message = 'DM role required';
  end if;

  perform 1
  from public.thong_bao tb
  where tb.id = target_notification_id
    and tb.nguoi_tao_id = auth.uid()
    and tb.trang_thai = 'CHƯA_GỬI'
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Notification must be an owned draft';
  end if;

  delete from public.thong_bao
  where id = target_notification_id
    and nguoi_tao_id = auth.uid()
    and trang_thai = 'CHƯA_GỬI';

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Notification must still be an owned draft';
  end if;
end;
$$;

-- Supabase projects may grant EXECUTE to API roles explicitly when functions
-- are created. Remove PUBLIC/anon access, then expose only the authenticated
-- entry points whose role and ownership checks are implemented above.
revoke all on function public.dm_update_notification_draft(uuid, text, text, text, uuid[]) from public, anon;
revoke all on function public.dm_delete_notification_draft(uuid) from public, anon;
grant execute on function public.dm_update_notification_draft(uuid, text, text, text, uuid[]) to authenticated;
grant execute on function public.dm_delete_notification_draft(uuid) to authenticated;


-- Consolidated repair source: supabase/migrations/20261017100000_rbac_lockout_protection.sql
-- Protect the last usable Admin session from self-lockout and make role
-- assignment changes RPC-only so the invariants below cannot be bypassed by DML.

create or replace function public.admin_lock_account(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_is_admin boolean;
  active_admin_count bigint;
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  perform pg_advisory_xact_lock(729318240112);

  if target_account_id = auth.uid() then
    raise exception using
      errcode = '42501',
      message = 'Admin cannot lock their own account';
  end if;

  select exists (
    select 1
    from public.phan_cong_vai_tro pc
    join public.vai_tro vt on vt.id = pc.vai_tro_id
    where pc.tai_khoan_id = target_account_id
      and vt.ma_vai_tro = 'ADMIN'
  ) into target_is_admin;

  if target_is_admin then
    select count(*)::bigint
    into active_admin_count
    from public.tai_khoan tk
    join public.phan_cong_vai_tro pc on pc.tai_khoan_id = tk.id
    join public.vai_tro vt on vt.id = pc.vai_tro_id
    where tk.trang_thai = 'DANG_HOAT_DONG'
      and vt.ma_vai_tro = 'ADMIN';

    if active_admin_count <= 1 then
      raise exception using
        errcode = '22023',
        message = 'Cannot lock the last active Admin account';
    end if;
  end if;

  update public.tai_khoan
  set trang_thai = 'KHOA'
  where id = target_account_id
    and trang_thai = 'DANG_HOAT_DONG';

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Account must be in DANG_HOAT_DONG state';
  end if;
end;
$$;

create or replace function public.admin_revoke_role(
  target_account_id uuid,
  target_role_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_role_code text;
  target_is_active boolean;
  active_admin_count bigint;
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  perform pg_advisory_xact_lock(729318240112);

  select vt.ma_vai_tro
  into target_role_code
  from public.vai_tro vt
  where vt.id = target_role_id;

  if not found then
    raise exception using errcode = '22023', message = 'Role does not exist';
  end if;

  if not exists (
    select 1
    from public.phan_cong_vai_tro pc
    where pc.tai_khoan_id = target_account_id
      and pc.vai_tro_id = target_role_id
  ) then
    raise exception using errcode = '22023', message = 'Role assignment does not exist';
  end if;

  if target_role_code = 'ADMIN' then
    if target_account_id = auth.uid() then
      raise exception using
        errcode = '42501',
        message = 'Admin cannot revoke their own Admin role';
    end if;

    select tk.trang_thai = 'DANG_HOAT_DONG'
    into target_is_active
    from public.tai_khoan tk
    where tk.id = target_account_id;

    if target_is_active then
      select count(*)::bigint
      into active_admin_count
      from public.tai_khoan tk
      join public.phan_cong_vai_tro pc on pc.tai_khoan_id = tk.id
      join public.vai_tro vt on vt.id = pc.vai_tro_id
      where tk.trang_thai = 'DANG_HOAT_DONG'
        and vt.ma_vai_tro = 'ADMIN';

      if active_admin_count <= 1 then
        raise exception using
          errcode = '22023',
          message = 'Cannot revoke the last active Admin role';
      end if;
    end if;
  end if;

  delete from public.phan_cong_vai_tro
  where tai_khoan_id = target_account_id
    and vai_tro_id = target_role_id;

  if not found then
    raise exception using errcode = '22023', message = 'Role assignment does not exist';
  end if;
end;
$$;

-- All account-role mutations go through admin_assign_role/admin_revoke_role so
-- direct DML cannot bypass self-lockout checks.
revoke insert, update, delete on table public.phan_cong_vai_tro from authenticated;

revoke all on function public.admin_lock_account(uuid) from public, anon;
revoke all on function public.admin_revoke_role(uuid, uuid) from public, anon;
grant execute on function public.admin_lock_account(uuid) to authenticated;
grant execute on function public.admin_revoke_role(uuid, uuid) to authenticated;


-- Consolidated repair source: supabase/migrations/20261017110000_permission_based_activity_scope.sql
-- Make the existing ACTIVITY_VIEW_SUBTREE permission authoritative rather than
-- coupling it to hard-coded DM/UM role codes. The migration-owned defaults still
-- grant this capability only to DM and UM; Admin may now intentionally map it to
-- another role through the role catalog workflow.

create or replace function public.can_view_activity(activity_owner_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select public.current_account_has_application_access()
    and (
      activity_owner_id = auth.uid()
      or (
        public.has_permission('ACTIVITY_VIEW_SUBTREE')
        and public.is_in_subtree(activity_owner_id)
      )
    );
$$;


-- Consolidated repair source: supabase/migrations/20261021130000_phase7_security_performance_hardening.sql
-- Phase 7 hardening: keep SECURITY DEFINER policy helpers outside the exposed public schema.
-- IMPORTANT: keep app_private out of Supabase Data API exposed schemas.
-- The wrappers deliberately preserve existing authorization predicates while preventing
-- direct /rest/v1/rpc access to generic helpers that accept arbitrary role/account IDs.

-- Do not expose the arbitrary-target hierarchy oracle over the Data API.
-- RLS still calls the internal helper; direct user-facing activity checks go through
-- this guarded SECURITY DEFINER function.
create or replace function public.can_view_activity(activity_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_account_has_application_access()
    and (
      activity_owner_id = auth.uid()
      or (
        public.has_permission('ACTIVITY_VIEW_SUBTREE')
        and public.is_in_subtree(activity_owner_id)
      )
    );
$$;

revoke all on function public.is_in_subtree(uuid) from public, anon, authenticated;
revoke all on function public.can_view_activity(uuid) from public, anon;
grant execute on function public.can_view_activity(uuid) to authenticated;

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
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));
alter policy vai_tro_application_access_gate on public.vai_tro
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));
alter policy quyen_application_access_gate on public.quyen
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));
alter policy phan_cong_vai_tro_application_access_gate on public.phan_cong_vai_tro
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));
alter policy phan_quyen_vai_tro_application_access_gate on public.phan_quyen_vai_tro
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));
alter policy khach_hang_application_access_gate on public.khach_hang
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));
alter policy hoat_dong_application_access_gate on public.hoat_dong
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));
alter policy thong_bao_application_access_gate on public.thong_bao
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));
alter policy thong_bao_nguoi_nhan_application_access_gate on public.thong_bao_nguoi_nhan
  using ((select app_private.current_account_has_application_access()))
  with check ((select app_private.current_account_has_application_access()));

alter policy tai_khoan_select_scope on public.tai_khoan
  using (
    id = (select auth.uid())
    or (select app_private.has_role('ADMIN'))
    or (
      ((select app_private.has_role('DM')) or (select app_private.has_role('UM')))
      and app_private.is_in_subtree(id)
    )
  );

alter policy vai_tro_insert_admin on public.vai_tro
  with check ((select app_private.has_role('ADMIN')));
alter policy vai_tro_update_admin on public.vai_tro
  using ((select app_private.has_role('ADMIN')))
  with check ((select app_private.has_role('ADMIN')));
alter policy vai_tro_delete_admin on public.vai_tro
  using ((select app_private.has_role('ADMIN')));

alter policy quyen_insert_admin on public.quyen
  with check ((select app_private.has_role('ADMIN')));
alter policy quyen_update_admin on public.quyen
  using ((select app_private.has_role('ADMIN')))
  with check ((select app_private.has_role('ADMIN')));
alter policy quyen_delete_admin on public.quyen
  using ((select app_private.has_role('ADMIN')));

alter policy phan_cong_vai_tro_select_scope on public.phan_cong_vai_tro
  using (
    tai_khoan_id = (select auth.uid())
    or (select app_private.has_role('ADMIN'))
  );
alter policy phan_cong_vai_tro_insert_admin on public.phan_cong_vai_tro
  with check ((select app_private.has_role('ADMIN')));
alter policy phan_cong_vai_tro_update_admin on public.phan_cong_vai_tro
  using ((select app_private.has_role('ADMIN')))
  with check ((select app_private.has_role('ADMIN')));
alter policy phan_cong_vai_tro_delete_admin on public.phan_cong_vai_tro
  using ((select app_private.has_role('ADMIN')));

alter policy phan_quyen_vai_tro_insert_admin on public.phan_quyen_vai_tro
  with check ((select app_private.has_role('ADMIN')));
alter policy phan_quyen_vai_tro_update_admin on public.phan_quyen_vai_tro
  using ((select app_private.has_role('ADMIN')))
  with check ((select app_private.has_role('ADMIN')));
alter policy phan_quyen_vai_tro_delete_admin on public.phan_quyen_vai_tro
  using ((select app_private.has_role('ADMIN')));

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
revoke all on function public.current_account_has_application_access() from public, anon;
grant execute on function public.current_account_has_application_access() to authenticated;
revoke all on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated;
revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;
revoke all on function public.is_in_subtree(uuid) from public, anon, authenticated;
revoke all on function public.can_view_activity(uuid) from public, anon;
grant execute on function public.can_view_activity(uuid) to authenticated;
revoke all on function public.can_creator_read_notification_recipient(uuid) from public, anon, authenticated;
revoke all on function public.can_recipient_read_sent_notification(uuid, uuid) from public, anon, authenticated;

-- Support FK maintenance and remove per-row evaluation of auth.uid() in policies.
create index if not exists idx_phan_cong_vai_tro_nguoi_gan_id
  on public.phan_cong_vai_tro (nguoi_gan_id);
create index if not exists idx_phan_quyen_vai_tro_nguoi_gan_id
  on public.phan_quyen_vai_tro (nguoi_gan_id);
