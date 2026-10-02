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

-- Phase 1 authorization helpers are exposed as RPCs to authenticated users.
-- Rebind them to the Phase 2 application-access gate so a pending, administratively
-- locked, or temporarily locked account cannot use them as an authorization oracle.
create or replace function public.has_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_account_has_application_access()
    and exists (
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
  select public.current_account_has_application_access()
    and exists (
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
  select public.current_account_has_application_access()
    and (
      target_account_id = auth.uid()
      or exists (select 1 from descendants d where d.id = target_account_id)
    );
$$;

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
        (public.has_role('DM') or public.has_role('UM'))
        and public.has_permission('ACTIVITY_VIEW_SUBTREE')
        and public.is_in_subtree(activity_owner_id)
      )
    );
$$;

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

-- Password-verification hook.
-- This is the security boundary for the canonical "6 consecutive failures ->
-- 30 minute lock" rule. Because Supabase Auth invokes the hook for password
-- verification itself, direct calls to the public Auth endpoint cannot bypass
-- the counter as they could when bookkeeping lived only in a Next.js action.
create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  account_id uuid;
  password_valid boolean;
  failed_attempts integer;
  locked_until timestamptz;
begin
  account_id := nullif(event ->> 'user_id', '')::uuid;
  password_valid := (event ->> 'valid')::boolean;

  if account_id is null or password_valid is null then
    raise exception using errcode = '22023', message = 'Invalid password verification hook payload';
  end if;

  select
    tk.dang_nhap_sai_lien_tiep,
    tk.khoa_tam_den
  into
    failed_attempts,
    locked_until
  from public.tai_khoan tk
  where tk.id = account_id
  for update;

  -- Auth identities that are not application accounts remain outside this
  -- business lock state machine. RLS still denies them business access.
  if not found then
    return jsonb_build_object('decision', 'continue');
  end if;

  -- Do not extend an existing temporary lock on additional bad attempts.
  -- A correct password during the lock is rejected at the Auth boundary.
  if locked_until is not null and locked_until > now() then
    if password_valid then
      return jsonb_build_object(
        'decision', 'reject',
        'message', 'Account temporarily locked. Try again later.',
        'should_logout_user', false
      );
    end if;

    return jsonb_build_object('decision', 'continue');
  end if;

  if password_valid then
    update public.tai_khoan
    set
      dang_nhap_sai_lien_tiep = 0,
      khoa_tam_den = null
    where id = account_id;

    return jsonb_build_object('decision', 'continue');
  end if;

  -- An expired lock starts a new consecutive-failure cycle.
  if locked_until is not null and locked_until <= now() then
    failed_attempts := 0;
  end if;

  failed_attempts := failed_attempts + 1;

  update public.tai_khoan
  set
    dang_nhap_sai_lien_tiep = failed_attempts,
    khoa_tam_den = case
      when failed_attempts >= 6 then now() + interval '30 minutes'
      else null
    end
  where id = account_id;

  -- Invalid credentials are still rejected by Supabase Auth itself. Returning
  -- continue here preserves the provider's credential error semantics.
  return jsonb_build_object('decision', 'continue');
end;
$$;

revoke all on function public.hook_password_verification_attempt(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.hook_password_verification_attempt(jsonb)
  to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

-- Keep the hook as SECURITY INVOKER. Supabase Auth receives only the columns it
-- needs for this state machine, plus a dedicated RLS policy for its internal role.
grant select (id, dang_nhap_sai_lien_tiep, khoa_tam_den)
  on table public.tai_khoan to supabase_auth_admin;
grant update (dang_nhap_sai_lien_tiep, khoa_tam_den)
  on table public.tai_khoan to supabase_auth_admin;

create policy tai_khoan_password_verification_hook
on public.tai_khoan
for all
to supabase_auth_admin
using (true)
with check (true);
