-- System audit trail: record structural actions without copying customer PII.
-- Access is enforced by PostgreSQL RLS and the Admin-only server page.

create table if not exists public.nhat_ky_he_thong (
  id bigint generated always as identity primary key,
  actor_id uuid references public.tai_khoan(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  occurred_at timestamptz not null default now()
);

-- Keep this migration safe if the table was created by an earlier version.
alter table public.nhat_ky_he_thong
  drop constraint if exists nhat_ky_he_thong_action_check;
alter table public.nhat_ky_he_thong
  add constraint nhat_ky_he_thong_action_check
  check (action in (
    'INSERT', 'UPDATE', 'DELETE',
    'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
    'AUTH_USER_CREATED', 'AUTH_USER_UPDATED'
  ));

create index if not exists nhat_ky_he_thong_occurred_at_idx
  on public.nhat_ky_he_thong (occurred_at desc, id desc);
create index if not exists nhat_ky_he_thong_actor_idx
  on public.nhat_ky_he_thong (actor_id, occurred_at desc);
create index if not exists nhat_ky_he_thong_entity_idx
  on public.nhat_ky_he_thong (entity, occurred_at desc);

alter table public.nhat_ky_he_thong enable row level security;
revoke all on public.nhat_ky_he_thong from anon, authenticated;
grant select on public.nhat_ky_he_thong to authenticated;

drop policy if exists "Admins can read system audit log" on public.nhat_ky_he_thong;
create policy "Admins can read system audit log"
  on public.nhat_ky_he_thong
  for select
  to authenticated
  using (public.has_role('ADMIN'));

create or replace function app_private.capture_system_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_id := v_row ->> 'id';
  insert into public.nhat_ky_he_thong (actor_id, action, entity, entity_id)
  values (auth.uid(), tg_op, tg_table_name, v_id);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function app_private.capture_system_audit_log() from public, anon, authenticated;

-- Supabase Auth owns auth.users. This trigger captures user creation and
-- meaningful identity/security changes, but deliberately does not copy email,
-- phone, metadata, password hashes, tokens, or other user payloads.
create or replace function app_private.capture_auth_user_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_user_id text;
begin
  if tg_op = 'INSERT' then
    v_action := 'AUTH_USER_CREATED';
    v_user_id := new.id::text;
  else
    v_action := 'AUTH_USER_UPDATED';
    v_user_id := new.id::text;
  end if;

  insert into public.nhat_ky_he_thong (actor_id, action, entity, entity_id)
  values (null, v_action, 'auth.users', v_user_id);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function app_private.capture_auth_user_audit_log() from public, anon, authenticated;

drop trigger if exists trg_audit_auth_users_insert on auth.users;
create trigger trg_audit_auth_users_insert
  after insert on auth.users
  for each row execute function app_private.capture_auth_user_audit_log();

drop trigger if exists trg_audit_auth_users_update on auth.users;
create trigger trg_audit_auth_users_update
  after update on auth.users
  for each row
  when (
    old.email is distinct from new.email
    or old.phone is distinct from new.phone
    or old.raw_user_meta_data is distinct from new.raw_user_meta_data
    or old.email_confirmed_at is distinct from new.email_confirmed_at
    or old.phone_confirmed_at is distinct from new.phone_confirmed_at
    or old.banned_until is distinct from new.banned_until
  )
  execute function app_private.capture_auth_user_audit_log();

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'tai_khoan',
    'phan_cong_vai_tro',
    'vai_tro',
    'quyen',
    'phan_quyen_vai_tro',
    'khach_hang',
    'hoat_dong',
    'thong_bao',
    'thong_bao_nguoi_nhan'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists trg_audit_%I on public.%I', v_table, v_table);
      execute format(
        'create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function app_private.capture_system_audit_log()',
        v_table,
        v_table
      );
    end if;
  end loop;
end;
$$;
