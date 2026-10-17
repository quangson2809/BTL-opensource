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
