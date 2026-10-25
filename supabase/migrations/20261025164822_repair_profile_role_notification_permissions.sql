-- Production compatibility repair: the live database has the access helper
-- in public while the profile policy migration references app_private.
create schema if not exists app_private;
create or replace function app_private.current_account_has_application_access()
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select public.current_account_has_application_access();
$$;
revoke all on function app_private.current_account_has_application_access() from public, anon;
grant execute on function app_private.current_account_has_application_access() to authenticated;

-- Consolidated source migration: supabase/migrations/20261017090000_admin_role_catalog_management.sql
-- Admin-managed custom role catalog, with permission mappings replaced atomically.
-- Role codes are identity keys used by application guards and cannot be renamed.
-- System roles and permission definitions remain immutable; custom roles can be edited.

create or replace function public.prevent_role_identity_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if old.ma_vai_tro in ('ADMIN', 'DM', 'UM', 'SA') then
      raise exception using
        errcode = '42501',
        message = 'System role records cannot be deleted';
    end if;
    return old;
  end if;

  if new.ma_vai_tro is distinct from old.ma_vai_tro then
    raise exception using
      errcode = '42501',
      message = 'Role codes are immutable identity keys';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_role_identity on public.vai_tro;
create trigger trg_protect_role_identity
before update of ma_vai_tro or delete on public.vai_tro
for each row execute function public.prevent_role_identity_mutation();

create or replace function public.admin_create_role(
  role_code text,
  role_name text,
  role_description text,
  permission_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_role_id uuid;
  normalized_permission_ids uuid[] := coalesce(permission_ids, array[]::uuid[]);
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  if role_code is null
     or btrim(role_code) !~ '^[A-Z][A-Z0-9_]*$'
     or upper(btrim(role_code)) in ('ADMIN', 'DM', 'UM', 'SA') then
    raise exception using errcode = '22023', message = 'Invalid or reserved role code';
  end if;

  if nullif(btrim(role_name), '') is null then
    raise exception using errcode = '22023', message = 'Role name is required';
  end if;

  if array_position(normalized_permission_ids, null) is not null
     or exists (
       select 1
       from unnest(normalized_permission_ids) selected(permission_id)
       left join public.quyen q on q.id = selected.permission_id
       where q.id is null
     ) then
    raise exception using errcode = '22023', message = 'Invalid permission selection';
  end if;

  insert into public.vai_tro (ma_vai_tro, ten_vai_tro, mo_ta)
  values (
    btrim(role_code),
    btrim(role_name),
    nullif(btrim(coalesce(role_description, '')), '')
  )
  returning id into created_role_id;

  insert into public.phan_quyen_vai_tro (vai_tro_id, quyen_id, nguoi_gan_id)
  select created_role_id, selected.permission_id, auth.uid()
  from (
    select distinct unnest(normalized_permission_ids) as permission_id
  ) selected;

  return created_role_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Role code or name already exists';
end;
$$;

create or replace function public.admin_update_role(
  target_role_id uuid,
  role_name text,
  role_description text,
  permission_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_permission_ids uuid[] := coalesce(permission_ids, array[]::uuid[]);
  target_role_code text;
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  select ma_vai_tro
  into target_role_code
  from public.vai_tro
  where id = target_role_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Role does not exist';
  end if;

  if target_role_code in ('ADMIN', 'DM', 'UM', 'SA') then
    raise exception using
      errcode = '42501',
      message = 'System roles cannot be edited';
  end if;

  if nullif(btrim(role_name), '') is null then
    raise exception using errcode = '22023', message = 'Role name is required';
  end if;

  if array_position(normalized_permission_ids, null) is not null
     or exists (
       select 1
       from unnest(normalized_permission_ids) selected(permission_id)
       left join public.quyen q on q.id = selected.permission_id
       where q.id is null
     ) then
    raise exception using errcode = '22023', message = 'Invalid permission selection';
  end if;

  update public.vai_tro
  set ten_vai_tro = btrim(role_name),
      mo_ta = nullif(btrim(coalesce(role_description, '')), '')
  where id = target_role_id;

  delete from public.phan_quyen_vai_tro
  where vai_tro_id = target_role_id;

  insert into public.phan_quyen_vai_tro (vai_tro_id, quyen_id, nguoi_gan_id)
  select target_role_id, selected.permission_id, auth.uid()
  from (
    select distinct unnest(normalized_permission_ids) as permission_id
  ) selected;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Role name already exists';
end;
$$;

revoke all on function public.admin_create_role(text, text, text, uuid[]) from public, anon;
revoke all on function public.admin_update_role(uuid, text, text, uuid[]) from public, anon;
grant execute on function public.admin_create_role(text, text, text, uuid[]) to authenticated;
grant execute on function public.admin_update_role(uuid, text, text, uuid[]) to authenticated;

-- Only the RPCs may write role metadata or role-permission mappings. Permission
-- definitions themselves remain migration-owned; the UI selects existing ones.
revoke insert, update, delete on table public.vai_tro from authenticated;
revoke insert, update, delete on table public.quyen from authenticated;
revoke insert, update, delete on table public.phan_quyen_vai_tro from authenticated;


-- Consolidated source migration: supabase/migrations/20261025120000_allow_system_role_permission_management.sql
-- Permit administrators to manage permission mappings for built-in roles.
-- Built-in role identity and descriptive metadata remain immutable; only the permission
-- set is mutable through this guarded, transactional RPC.
create or replace function public.admin_update_role(
  target_role_id uuid,
  role_name text,
  role_description text,
  permission_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_permission_ids uuid[] := coalesce(permission_ids, array[]::uuid[]);
  target_role_code text;
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  select ma_vai_tro
  into target_role_code
  from public.vai_tro
  where id = target_role_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Role does not exist';
  end if;

  if target_role_code = 'ADMIN' then
    raise exception using errcode = '42501', message = 'ADMIN role is immutable';
  end if;

  if array_position(normalized_permission_ids, null) is not null
     or exists (
       select 1
       from unnest(normalized_permission_ids) selected(permission_id)
       left join public.quyen q on q.id = selected.permission_id
       where q.id is null
     ) then
    raise exception using errcode = '22023', message = 'Invalid permission selection';
  end if;

  if target_role_code not in ('ADMIN', 'DM', 'UM', 'SA') then
    if nullif(btrim(role_name), '') is null then
      raise exception using errcode = '22023', message = 'Role name is required';
    end if;

    update public.vai_tro
    set ten_vai_tro = btrim(role_name),
        mo_ta = nullif(btrim(coalesce(role_description, '')), '')
    where id = target_role_id;
  end if;

  delete from public.phan_quyen_vai_tro
  where vai_tro_id = target_role_id;

  insert into public.phan_quyen_vai_tro (vai_tro_id, quyen_id, nguoi_gan_id)
  select target_role_id, selected.permission_id, auth.uid()
  from (
    select distinct unnest(normalized_permission_ids) as permission_id
  ) selected;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Role name already exists';
end;
$$;

revoke all on function public.admin_update_role(uuid, text, text, uuid[]) from public, anon;
grant execute on function public.admin_update_role(uuid, text, text, uuid[]) to authenticated;


-- Consolidated source migration: supabase/migrations/20261025140000_notification_management_permission.sql
-- Notification management is a separately grantable capability.
-- ADMIN assigns/revokes NOTIFICATION_MANAGE in the existing role permission editor.
insert into public.quyen (ma_quyen, ten_quyen, mo_ta)
values (
  'NOTIFICATION_MANAGE',
  'Quản lý thông báo',
  'Tạo, sửa bản nháp, xóa bản nháp và gửi thông báo trong phạm vi quản lý'
)
on conflict (ma_quyen) do update
set ten_quyen = excluded.ten_quyen,
    mo_ta = excluded.mo_ta;

-- Do not auto-grant the permission: an ADMIN must explicitly map it to DM.
create or replace function public.dm_create_notification(
  notification_title text,
  notification_content text,
  notification_type text,
  recipient_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  notification_id uuid;
  recipient_id uuid;
begin
  if not public.has_role('DM') or not public.has_permission('NOTIFICATION_MANAGE') then
    raise exception using errcode = '42501', message = 'Notification management permission required';
  end if;
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;
  if nullif(btrim(notification_title), '') is null
     or nullif(btrim(notification_content), '') is null then
    raise exception using errcode = '22023', message = 'Notification title and content are required';
  end if;
  if notification_type not in ('TIN_TỨC', 'TỰ_ĐỘNG_HỆ_THỐNG') then
    raise exception using errcode = '22023', message = 'Invalid notification type';
  end if;
  if recipient_ids is null or cardinality(recipient_ids) = 0 or array_position(recipient_ids, null) is not null then
    raise exception using errcode = '22023', message = 'At least one recipient is required';
  end if;
  foreach recipient_id in array recipient_ids loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient is outside DM scope';
    end if;
  end loop;
  insert into public.thong_bao (nguoi_tao_id, tieu_de, noi_dung, loai, trang_thai)
  values (auth.uid(), btrim(notification_title), btrim(notification_content), notification_type, 'CHƯA_GỬI')
  returning id into notification_id;
  insert into public.thong_bao_nguoi_nhan (thong_bao_id, tai_khoan_id)
  select notification_id, recipients.scoped_recipient_id
  from (select distinct unnest(recipient_ids) as scoped_recipient_id) recipients;
  return notification_id;
end;
$$;

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
declare recipient_id uuid;
begin
  if not public.has_role('DM') or not public.has_permission('NOTIFICATION_MANAGE') then
    raise exception using errcode = '42501', message = 'Notification management permission required';
  end if;
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;
  perform 1 from public.thong_bao tb
  where tb.id = target_notification_id and tb.nguoi_tao_id = auth.uid() and tb.trang_thai = 'CHƯA_GỬI'
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'Notification must be an owned draft';
  end if;
  if nullif(btrim(notification_title), '') is null
     or nullif(btrim(notification_content), '') is null
     or notification_type is null
     or notification_type not in ('TIN_TỨC', 'TỰ_ĐỘNG_HỆ_THỐNG') then
    raise exception using errcode = '22023', message = 'Invalid notification fields';
  end if;
  if recipient_ids is null or cardinality(recipient_ids) = 0 or array_position(recipient_ids, null) is not null then
    raise exception using errcode = '22023', message = 'At least one valid recipient is required';
  end if;
  for recipient_id in select distinct candidate_id from unnest(recipient_ids) as recipient(candidate_id) loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient is outside DM scope';
    end if;
  end loop;
  update public.thong_bao set tieu_de = btrim(notification_title), noi_dung = btrim(notification_content),
    loai = notification_type, updated_at = now() where id = target_notification_id;
  delete from public.thong_bao_nguoi_nhan where thong_bao_id = target_notification_id;
  insert into public.thong_bao_nguoi_nhan (thong_bao_id, tai_khoan_id)
  select target_notification_id, recipient.scoped_recipient_id
  from (select distinct unnest(recipient_ids) as scoped_recipient_id) recipient;
end;
$$;

create or replace function public.dm_delete_notification_draft(target_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role('DM') or not public.has_permission('NOTIFICATION_MANAGE') then
    raise exception using errcode = '42501', message = 'Notification management permission required';
  end if;
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;
  perform 1 from public.thong_bao tb
  where tb.id = target_notification_id and tb.nguoi_tao_id = auth.uid() and tb.trang_thai = 'CHƯA_GỬI'
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'Notification must be an owned draft';
  end if;
  delete from public.thong_bao where id = target_notification_id
    and nguoi_tao_id = auth.uid() and trang_thai = 'CHƯA_GỬI';
  if not found then raise exception using errcode = '22023', message = 'Notification must still be an owned draft'; end if;
end;
$$;

create or replace function public.dm_send_notification(target_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare recipient_id uuid;
begin
  if not public.has_role('DM') or not public.has_permission('NOTIFICATION_MANAGE') then
    raise exception using errcode = '42501', message = 'Notification management permission required';
  end if;
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;
  perform 1 from public.thong_bao tb
  where tb.id = target_notification_id and tb.nguoi_tao_id = auth.uid() and tb.trang_thai = 'CHƯA_GỬI'
  for update;
  if not found then raise exception using errcode = '22023', message = 'Notification must be an owned draft'; end if;
  if not exists (select 1 from public.thong_bao_nguoi_nhan where thong_bao_id = target_notification_id) then
    raise exception using errcode = '22023', message = 'Notification has no recipients';
  end if;
  for recipient_id in select tai_khoan_id from public.thong_bao_nguoi_nhan where thong_bao_id = target_notification_id loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient left DM scope';
    end if;
  end loop;
  update public.thong_bao set trang_thai = 'ĐÃ_GỬI' where id = target_notification_id;
end;
$$;

revoke all on function public.dm_create_notification(text, text, text, uuid[]) from public, anon;
revoke all on function public.dm_update_notification_draft(uuid, text, text, text, uuid[]) from public, anon;
revoke all on function public.dm_delete_notification_draft(uuid) from public, anon;
revoke all on function public.dm_send_notification(uuid) from public, anon;
grant execute on function public.dm_create_notification(text, text, text, uuid[]) to authenticated;
grant execute on function public.dm_update_notification_draft(uuid, text, text, text, uuid[]) to authenticated;
grant execute on function public.dm_delete_notification_draft(uuid) to authenticated;
grant execute on function public.dm_send_notification(uuid) to authenticated;


-- Consolidated source migration: supabase/migrations/20261024090000_agency_profile_self_update.sql
-- Allow the signed-in user to update only their own display name.
-- Contact details and account authorization fields remain immutable through
-- direct table updates; privileged account changes continue through guarded RPCs.

revoke update on table public.tai_khoan from anon, authenticated;
revoke update (
  id,
  ho_ten,
  email,
  so_dien_thoai,
  ma_dai_ly,
  manager_id,
  trang_thai,
  created_at,
  updated_at,
  dang_nhap_sai_lien_tiep,
  khoa_tam_den
) on table public.tai_khoan from anon, authenticated;

grant update (ho_ten) on table public.tai_khoan to authenticated;

drop policy if exists tai_khoan_update_own_profile on public.tai_khoan;
create policy tai_khoan_update_own_profile
on public.tai_khoan
as permissive
for update
to authenticated
using (
  id = (select auth.uid())
  and (select app_private.current_account_has_application_access())
)
with check (
  id = (select auth.uid())
  and (select app_private.current_account_has_application_access())
);


-- Consolidated source migration: supabase/migrations/20261024160000_agency_profile_phone_update.sql
-- Allow an active authenticated account to update its own phone number.
-- Keep all system-managed identity, authorization, and hierarchy fields protected.
-- The existing unique constraint on so_dien_thoai prevents duplicate phone ownership.

revoke update on table public.tai_khoan from anon, authenticated;
revoke update (
  id,
  ho_ten,
  email,
  so_dien_thoai,
  ma_dai_ly,
  manager_id,
  trang_thai,
  created_at,
  updated_at,
  dang_nhap_sai_lien_tiep,
  khoa_tam_den
) on table public.tai_khoan from anon, authenticated;

grant update (ho_ten, so_dien_thoai) on table public.tai_khoan to authenticated;

drop policy if exists tai_khoan_update_own_profile on public.tai_khoan;
create policy tai_khoan_update_own_profile
on public.tai_khoan
as permissive
for update
to authenticated
using (
  id = (select auth.uid())
  and (select app_private.current_account_has_application_access())
)
with check (
  id = (select auth.uid())
  and (select app_private.current_account_has_application_access())
);


-- Consolidated source migration: supabase/migrations/20261025170000_seed_dm_notification_management.sql
-- Enable the existing notification feature for the standard DM role.
-- The application exposes draft creation/edit/delete/send to DM, so the baseline
-- role must have NOTIFICATION_MANAGE after a clean install or an upgrade.
-- ADMIN can still change this mapping later through admin_update_role.
insert into public.phan_quyen_vai_tro (vai_tro_id, quyen_id, nguoi_gan_id)
select vt.id, q.id, null
from public.vai_tro vt
join public.quyen q on q.ma_quyen = 'NOTIFICATION_MANAGE'
where vt.ma_vai_tro = 'DM'
on conflict (vai_tro_id, quyen_id) do nothing;
