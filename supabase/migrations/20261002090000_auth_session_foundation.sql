-- Phase 2 foundation: authentication/session business-state enforcement.
-- Source contract: GitHub Issue #5 + canonical PDF-derived requirements.

alter table public.tai_khoan
  add column dang_nhap_sai_lien_tiep integer not null default 0,
  add column khoa_tam_den timestamptz;

alter table public.tai_khoan
  add constraint tai_khoan_dang_nhap_sai_lien_tiep_check
  check (dang_nhap_sai_lien_tiep >= 0);

create or replace function public.current_account_has_application_access()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.tai_khoan tk
    where tk.id = auth.uid()
      and tk.trang_thai = 'DANG_HOAT_DONG'
      and (tk.khoa_tam_den is null or tk.khoa_tam_den <= now())
  );
$$;

revoke all on function public.current_account_has_application_access() from public;
grant execute on function public.current_account_has_application_access() to authenticated;

-- A restrictive policy composes with every existing permissive Phase 1 policy.
-- A valid Supabase JWT therefore cannot bypass pending/admin-lock/temp-lock state.
create policy tai_khoan_application_access_gate
on public.tai_khoan
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

create policy vai_tro_application_access_gate
on public.vai_tro
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

create policy quyen_application_access_gate
on public.quyen
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

create policy phan_cong_vai_tro_application_access_gate
on public.phan_cong_vai_tro
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

create policy phan_quyen_vai_tro_application_access_gate
on public.phan_quyen_vai_tro
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

create policy khach_hang_application_access_gate
on public.khach_hang
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

create policy hoat_dong_application_access_gate
on public.hoat_dong
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

create policy thong_bao_application_access_gate
on public.thong_bao
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

create policy thong_bao_nguoi_nhan_application_access_gate
on public.thong_bao_nguoi_nhan
as restrictive
for all
to authenticated
using (public.current_account_has_application_access())
with check (public.current_account_has_application_access());

-- Self-registration is deliberately identified by a fixed metadata marker.
-- Other auth.users creation paths (for example future Admin provisioning and tests)
-- are not silently treated as SA self-registration.
create or replace function public.provision_self_registered_sa()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  sa_role_id uuid;
  full_name text;
  phone_number text;
  agent_code text;
begin
  if coalesce(new.raw_user_meta_data ->> 'registration_type', '') <> 'SA_SELF_REGISTRATION' then
    return new;
  end if;

  full_name := nullif(btrim(new.raw_user_meta_data ->> 'ho_ten'), '');
  phone_number := nullif(btrim(new.raw_user_meta_data ->> 'so_dien_thoai'), '');
  agent_code := nullif(btrim(new.raw_user_meta_data ->> 'ma_dai_ly'), '');

  if new.email is null or btrim(new.email) = '' then
    raise exception using errcode = '22023', message = 'Email is required for SA self-registration';
  end if;

  if full_name is null or phone_number is null or agent_code is null then
    raise exception using errcode = '22023', message = 'Missing required SA self-registration metadata';
  end if;

  select vt.id
  into sa_role_id
  from public.vai_tro vt
  where vt.ma_vai_tro = 'SA';

  if sa_role_id is null then
    raise exception using errcode = '55000', message = 'SA role seed is missing';
  end if;

  insert into public.tai_khoan (
    id,
    ho_ten,
    email,
    so_dien_thoai,
    ma_dai_ly,
    manager_id,
    trang_thai
  )
  values (
    new.id,
    full_name,
    lower(btrim(new.email)),
    phone_number,
    agent_code,
    null,
    'CHO_PHE_DUYET'
  );

  insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
  values (new.id, sa_role_id);

  return new;
end;
$$;

revoke all on function public.provision_self_registered_sa() from public;

create trigger on_auth_user_created_provision_self_registered_sa
after insert on auth.users
for each row execute function public.provision_self_registered_sa();

-- Server-only login bookkeeping. These functions are callable only through an
-- elevated Supabase server client (secret/service-role equivalent), never by
-- anon/authenticated application clients.
create or replace function public.record_failed_login(account_email text)
returns table (
  failed_attempts integer,
  locked_until timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  update public.tai_khoan tk
  set
    dang_nhap_sai_lien_tiep = case
      when tk.khoa_tam_den is not null and tk.khoa_tam_den <= now() then 1
      else tk.dang_nhap_sai_lien_tiep + 1
    end,
    khoa_tam_den = case
      when (
        case
          when tk.khoa_tam_den is not null and tk.khoa_tam_den <= now() then 1
          else tk.dang_nhap_sai_lien_tiep + 1
        end
      ) >= 6 then now() + interval '30 minutes'
      when tk.khoa_tam_den is not null and tk.khoa_tam_den <= now() then null
      else tk.khoa_tam_den
    end
  where lower(tk.email) = lower(btrim(account_email))
    and (tk.khoa_tam_den is null or tk.khoa_tam_den <= now())
  returning tk.dang_nhap_sai_lien_tiep, tk.khoa_tam_den;
end;
$$;

create or replace function public.reset_login_failures(account_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.tai_khoan
  set
    dang_nhap_sai_lien_tiep = 0,
    khoa_tam_den = null
  where id = account_id;
$$;

revoke all on function public.record_failed_login(text) from public, anon, authenticated;
revoke all on function public.reset_login_failures(uuid) from public, anon, authenticated;

grant execute on function public.record_failed_login(text) to service_role;
grant execute on function public.reset_login_failures(uuid) to service_role;
