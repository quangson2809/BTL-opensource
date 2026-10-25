-- Allow a user to remove only their own account while it is awaiting approval.
-- Auth deletion cascades to tai_khoan; manager references are nulled by the existing FK.
alter table public.tai_khoan
  drop constraint if exists tai_khoan_auth_user_fk;
alter table public.tai_khoan
  add constraint tai_khoan_auth_user_fk
  foreign key (id) references auth.users(id) on delete cascade;

create or replace function public.delete_own_pending_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_status text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select trang_thai
    into current_status
  from public.tai_khoan
  where id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Account profile does not exist';
  end if;

  if current_status <> 'CHO_PHE_DUYET' then
    raise exception using errcode = '42501', message = 'Only pending accounts may self-delete';
  end if;

  -- A pending account must not be allowed to erase established business records.
  if exists (select 1 from public.khach_hang where chu_so_huu_id = current_user_id)
     or exists (select 1 from public.hoat_dong where tai_khoan_id = current_user_id)
     or exists (
       select 1 from public.thong_bao
       where nguoi_tao_id = current_user_id and trang_thai = 'ĐÃ_GỬI'
     ) then
    raise exception using errcode = '23503', message = 'Account has business records and cannot self-delete';
  end if;

  -- Drafts are disposable; sent notifications remain immutable.
  delete from public.thong_bao
  where nguoi_tao_id = current_user_id
    and trang_thai = 'CHƯA_GỬI';

  -- The FK cascade removes the profile and role assignments as part of this transaction.
  delete from auth.users where id = current_user_id;
  if not found then
    raise exception using errcode = '22023', message = 'Auth identity does not exist';
  end if;
end;
$$;

revoke all on function public.delete_own_pending_account() from public, anon;
grant execute on function public.delete_own_pending_account() to authenticated;
