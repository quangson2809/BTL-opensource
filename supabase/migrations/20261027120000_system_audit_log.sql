-- System audit trail: record structural actions without copying customer PII.
-- Access is enforced by PostgreSQL RLS and the Admin-only server page.

create table if not exists public.nhat_ky_he_thong (
  id bigint generated always as identity primary key,
  actor_id uuid references public.tai_khoan(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity text not null,
  entity_id text,
  occurred_at timestamptz not null default now()
);

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
