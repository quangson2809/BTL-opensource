-- Draft-only notification management.
-- Sent notifications remain immutable: both RPCs lock and re-check the row state
-- before changing any notification or recipient rows.

create or replace function public.dm_update_notification_draft(
  target_notification_id uuid,
  notification_title text,
  notification_content text,
  notification_type text,
  recipient_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  recipient_id uuid;
begin
  if not public.has_role('DM') then
    raise exception using errcode = '42501', message = 'DM role required';
  end if;

  perform 1
  from public.thong_bao tb
  where tb.id = target_notification_id
    and tb.nguoi_tao_id = auth.uid()
    and tb.trang_thai = 'CHƯA_GỬI'
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Notification must be an owned draft';
  end if;

  if nullif(btrim(notification_title), '') is null
     or nullif(btrim(notification_content), '') is null
     or notification_type is null
     or notification_type not in ('TIN_TỨC', 'TỰ_ĐỘNG_HỆ_THỐNG') then
    raise exception using errcode = '22023', message = 'Invalid notification fields';
  end if;

  if recipient_ids is null
     or cardinality(recipient_ids) = 0
     or array_position(recipient_ids, null) is not null then
    raise exception using errcode = '22023', message = 'At least one valid recipient is required';
  end if;

  for recipient_id in
    select distinct candidate_id
    from unnest(recipient_ids) as recipient(candidate_id)
  loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient is outside DM scope';
    end if;
  end loop;

  update public.thong_bao
  set tieu_de = btrim(notification_title),
      noi_dung = btrim(notification_content),
      loai = notification_type,
      updated_at = now()
  where id = target_notification_id;

  delete from public.thong_bao_nguoi_nhan
  where thong_bao_id = target_notification_id;

  insert into public.thong_bao_nguoi_nhan (thong_bao_id, tai_khoan_id)
  select target_notification_id, recipient.scoped_recipient_id
  from (
    select distinct unnest(recipient_ids) as scoped_recipient_id
  ) recipient;
end;
$$;

create or replace function public.dm_delete_notification_draft(
  target_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role('DM') then
    raise exception using errcode = '42501', message = 'DM role required';
  end if;

  perform 1
  from public.thong_bao tb
  where tb.id = target_notification_id
    and tb.nguoi_tao_id = auth.uid()
    and tb.trang_thai = 'CHƯA_GỬI'
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Notification must be an owned draft';
  end if;

  delete from public.thong_bao
  where id = target_notification_id
    and nguoi_tao_id = auth.uid()
    and trang_thai = 'CHƯA_GỬI';

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Notification must still be an owned draft';
  end if;
end;
$$;

-- Supabase projects may grant EXECUTE to API roles explicitly when functions
-- are created. Remove PUBLIC/anon access, then expose only the authenticated
-- entry points whose role and ownership checks are implemented above.
revoke all on function public.dm_update_notification_draft(uuid, text, text, text, uuid[]) from public, anon;
revoke all on function public.dm_delete_notification_draft(uuid) from public, anon;
grant execute on function public.dm_update_notification_draft(uuid, text, text, text, uuid[]) to authenticated;
grant execute on function public.dm_delete_notification_draft(uuid) to authenticated;
