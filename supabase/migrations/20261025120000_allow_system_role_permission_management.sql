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
