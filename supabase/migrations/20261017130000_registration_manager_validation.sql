-- Database-authoritative direct-manager validation for SA self-registration.
create or replace function public.provision_self_registered_sa()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare sa_role_id uuid; manager_account_id uuid; full_name text; phone_number text; agent_code text; manager_code text;
begin
  if coalesce(new.raw_user_meta_data ->> 'registration_type', '') <> 'SA_SELF_REGISTRATION' then return new; end if;
  full_name := nullif(btrim(new.raw_user_meta_data ->> 'ho_ten'), '');
  phone_number := nullif(btrim(new.raw_user_meta_data ->> 'so_dien_thoai'), '');
  agent_code := nullif(btrim(new.raw_user_meta_data ->> 'ma_dai_ly'), '');
  manager_code := nullif(btrim(new.raw_user_meta_data ->> 'manager_code'), '');
  if new.email is null or btrim(new.email) = '' then raise exception using errcode='22023', message='Email is required for SA self-registration'; end if;
  if full_name is null or phone_number is null or agent_code is null or manager_code is null then raise exception using errcode='22023', message='Missing required SA self-registration metadata'; end if;
  select vt.id into sa_role_id from public.vai_tro vt where vt.ma_vai_tro='SA';
  if sa_role_id is null then raise exception using errcode='55000', message='SA role seed is missing'; end if;
  select tk.id into manager_account_id from public.tai_khoan tk
    join public.phan_cong_vai_tro pc on pc.tai_khoan_id=tk.id
    join public.vai_tro vt on vt.id=pc.vai_tro_id
    where tk.ma_dai_ly=manager_code and tk.trang_thai='DANG_HOAT_DONG' and vt.ma_vai_tro in ('DM','UM')
    order by case when vt.ma_vai_tro='UM' then 0 else 1 end limit 1
    for key share of tk,pc,vt;
  if manager_account_id is null then raise exception using errcode='22023', message='Invalid direct manager for SA self-registration'; end if;
  insert into public.tai_khoan (id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai)
    values (new.id,full_name,lower(btrim(new.email)),phone_number,agent_code,manager_account_id,'CHO_PHE_DUYET');
  insert into public.phan_cong_vai_tro (tai_khoan_id,vai_tro_id) values (new.id,sa_role_id);
  return new;
end;
$$;
revoke all on function public.provision_self_registered_sa() from public;
