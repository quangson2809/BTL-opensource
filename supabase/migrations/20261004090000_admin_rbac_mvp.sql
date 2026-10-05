-- Phase 3: Admin / RBAC MVP.
-- Admin mutations are exposed as narrow database RPCs so authorization is
-- enforced with the caller's user JWT as well as by the server-side UI.

create or replace function public.admin_approve_account(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  update public.tai_khoan
  set trang_thai = 'DANG_HOAT_DONG'
  where id = target_account_id
    and trang_thai = 'CHO_PHE_DUYET';

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Account must be in CHO_PHE_DUYET state';
  end if;
end;
$$;

create or replace function public.admin_lock_account(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
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

create or replace function public.admin_unlock_account(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  update public.tai_khoan
  set trang_thai = 'DANG_HOAT_DONG'
  where id = target_account_id
    and trang_thai = 'KHOA';

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Account must be in KHOA state';
  end if;
end;
$$;

create or replace function public.admin_assign_role(
  target_account_id uuid,
  target_role_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  if not exists (
    select 1 from public.tai_khoan where id = target_account_id
  ) then
    raise exception using errcode = '22023', message = 'Account does not exist';
  end if;

  if not exists (
    select 1 from public.vai_tro where id = target_role_id
  ) then
    raise exception using errcode = '22023', message = 'Role does not exist';
  end if;

  insert into public.phan_cong_vai_tro (
    tai_khoan_id,
    vai_tro_id,
    nguoi_gan_id
  )
  values (
    target_account_id,
    target_role_id,
    auth.uid()
  )
  on conflict (tai_khoan_id, vai_tro_id) do nothing;
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
begin
  if not public.has_role('ADMIN') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;

  delete from public.phan_cong_vai_tro
  where tai_khoan_id = target_account_id
    and vai_tro_id = target_role_id;
end;
$$;

revoke all on function public.admin_approve_account(uuid) from public;
revoke all on function public.admin_lock_account(uuid) from public;
revoke all on function public.admin_unlock_account(uuid) from public;
revoke all on function public.admin_assign_role(uuid, uuid) from public;
revoke all on function public.admin_revoke_role(uuid, uuid) from public;

grant execute on function public.admin_approve_account(uuid) to authenticated;
grant execute on function public.admin_lock_account(uuid) to authenticated;
grant execute on function public.admin_unlock_account(uuid) to authenticated;
grant execute on function public.admin_assign_role(uuid, uuid) to authenticated;
grant execute on function public.admin_revoke_role(uuid, uuid) to authenticated;
