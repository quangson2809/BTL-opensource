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
