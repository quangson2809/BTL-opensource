-- R7: Auth identity is created by the server Admin API; business provisioning
-- remains authorized by the requesting Admin's password-session JWT.
create or replace function public.admin_create_business_account(
  target_auth_user_id uuid,
  full_name text,
  account_email text,
  phone_number text,
  agent_code text,
  direct_manager_id uuid,
  selected_role_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  identity_email text;
  identity_metadata jsonb;
begin
  if not public.current_account_has_application_access() or not public.has_role('ADMIN') then
    raise exception using errcode='42501', message='Active Admin session required';
  end if;
  if target_auth_user_id is null then
    raise exception using errcode='22023', message='Creation request required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_auth_user_id::text, 20261106));
  select u.email, u.raw_app_meta_data into identity_email, identity_metadata
  from auth.users u where u.id=target_auth_user_id;
  if not found
     or identity_metadata->>'admin_creation_request' is distinct from target_auth_user_id::text
     or identity_metadata->>'admin_creation_actor' is distinct from auth.uid()::text
     or lower(btrim(account_email)) is distinct from lower(identity_email) then
    raise exception using errcode='42501', message='Identity does not belong to this Admin creation request';
  end if;
  -- Retrying a committed request returns the same account without mutating it.
  if exists(select 1 from public.tai_khoan where id=target_auth_user_id) then
    return target_auth_user_id;
  end if;
  if nullif(btrim(full_name),'') is null or nullif(btrim(phone_number),'') is null
     or nullif(btrim(agent_code),'') is null or selected_role_ids is null
     or full_name ~ '[[:cntrl:]]' or agent_code ~ '[[:cntrl:]]'
     or btrim(phone_number) !~ '^[+]?[0-9][0-9 ().-]{7,19}$'
     or cardinality(selected_role_ids)=0 or array_position(selected_role_ids,null) is not null
     or exists(select 1 from unnest(selected_role_ids) r(id) left join public.vai_tro v on v.id=r.id where v.id is null) then
    raise exception using errcode='22023', message='Invalid account profile or roles';
  end if;
  if direct_manager_id is null then
    if not exists(select 1 from public.vai_tro where id=any(selected_role_ids) and ma_vai_tro in ('ADMIN','DM')) then
      raise exception using errcode='22023', message='Direct manager required for this account';
    end if;
  elsif direct_manager_id=target_auth_user_id or not exists(
    select 1 from public.tai_khoan t
    join public.phan_cong_vai_tro pc on pc.tai_khoan_id=t.id
    join public.vai_tro v on v.id=pc.vai_tro_id
    where t.id=direct_manager_id and t.trang_thai='DANG_HOAT_DONG' and v.ma_vai_tro in ('DM','UM')
  ) then
    raise exception using errcode='22023', message='An active DM or UM manager is required';
  end if;
  insert into public.tai_khoan(id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai)
  values(target_auth_user_id,btrim(full_name),lower(btrim(account_email)),btrim(phone_number),btrim(agent_code),direct_manager_id,'DANG_HOAT_DONG');
  insert into public.phan_cong_vai_tro(tai_khoan_id,vai_tro_id,nguoi_gan_id)
  select target_auth_user_id,r.id,auth.uid() from (select distinct unnest(selected_role_ids) id) r;
  return target_auth_user_id;
end;
$$;
revoke all on function public.admin_create_business_account(uuid,text,text,text,text,uuid,uuid[]) from public,anon;
grant execute on function public.admin_create_business_account(uuid,text,text,text,text,uuid,uuid[]) to authenticated;
