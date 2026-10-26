-- Notification management is a separately grantable capability.
-- ADMIN assigns/revokes NOTIFICATION_MANAGE in the existing role permission editor.
insert into public.quyen (ma_quyen, ten_quyen, mo_ta)
values (
  'NOTIFICATION_MANAGE',
  'Quản lý thông báo',
  'Tạo, sửa bản nháp, xóa bản nháp và gửi thông báo trong phạm vi quản lý'
)
on conflict (ma_quyen) do update
set ten_quyen = excluded.ten_quyen,
    mo_ta = excluded.mo_ta;

-- Do not auto-grant the permission: an ADMIN must explicitly map it to DM.
create or replace function public.dm_create_notification(
  notification_title text,
  notification_content text,
  notification_type text,
  recipient_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  notification_id uuid;
  recipient_id uuid;
begin
  if not public.has_role('DM') or not public.has_permission('NOTIFICATION_MANAGE') then
    raise exception using errcode = '42501', message = 'Notification management permission required';
  end if;
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;
  if nullif(btrim(notification_title), '') is null
     or nullif(btrim(notification_content), '') is null then
    raise exception using errcode = '22023', message = 'Notification title and content are required';
  end if;
  if notification_type not in ('TIN_TỨC', 'TỰ_ĐỘNG_HỆ_THỐNG') then
    raise exception using errcode = '22023', message = 'Invalid notification type';
  end if;
  if recipient_ids is null or cardinality(recipient_ids) = 0 or array_position(recipient_ids, null) is not null then
    raise exception using errcode = '22023', message = 'At least one recipient is required';
  end if;
  foreach recipient_id in array recipient_ids loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient is outside DM scope';
    end if;
  end loop;
  insert into public.thong_bao (nguoi_tao_id, tieu_de, noi_dung, loai, trang_thai)
  values (auth.uid(), btrim(notification_title), btrim(notification_content), notification_type, 'CHƯA_GỬI')
  returning id into notification_id;
  insert into public.thong_bao_nguoi_nhan (thong_bao_id, tai_khoan_id)
  select notification_id, recipients.scoped_recipient_id
  from (select distinct unnest(recipient_ids) as scoped_recipient_id) recipients;
  return notification_id;
end;
$$;

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
declare recipient_id uuid;
begin
  if not public.has_role('DM') or not public.has_permission('NOTIFICATION_MANAGE') then
    raise exception using errcode = '42501', message = 'Notification management permission required';
  end if;
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;
  perform 1 from public.thong_bao tb
  where tb.id = target_notification_id and tb.nguoi_tao_id = auth.uid() and tb.trang_thai = 'CHƯA_GỬI'
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'Notification must be an owned draft';
  end if;
  if nullif(btrim(notification_title), '') is null
     or nullif(btrim(notification_content), '') is null
     or notification_type is null
     or notification_type not in ('TIN_TỨC', 'TỰ_ĐỘNG_HỆ_THỐNG') then
    raise exception using errcode = '22023', message = 'Invalid notification fields';
  end if;
  if recipient_ids is null or cardinality(recipient_ids) = 0 or array_position(recipient_ids, null) is not null then
    raise exception using errcode = '22023', message = 'At least one valid recipient is required';
  end if;
  for recipient_id in select distinct candidate_id from unnest(recipient_ids) as recipient(candidate_id) loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient is outside DM scope';
    end if;
  end loop;
  update public.thong_bao set tieu_de = btrim(notification_title), noi_dung = btrim(notification_content),
    loai = notification_type, updated_at = now() where id = target_notification_id;
  delete from public.thong_bao_nguoi_nhan where thong_bao_id = target_notification_id;
  insert into public.thong_bao_nguoi_nhan (thong_bao_id, tai_khoan_id)
  select target_notification_id, recipient.scoped_recipient_id
  from (select distinct unnest(recipient_ids) as scoped_recipient_id) recipient;
end;
$$;

create or replace function public.dm_delete_notification_draft(target_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role('DM') or not public.has_permission('NOTIFICATION_MANAGE') then
    raise exception using errcode = '42501', message = 'Notification management permission required';
  end if;
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;
  perform 1 from public.thong_bao tb
  where tb.id = target_notification_id and tb.nguoi_tao_id = auth.uid() and tb.trang_thai = 'CHƯA_GỬI'
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'Notification must be an owned draft';
  end if;
  delete from public.thong_bao where id = target_notification_id
    and nguoi_tao_id = auth.uid() and trang_thai = 'CHƯA_GỬI';
  if not found then raise exception using errcode = '22023', message = 'Notification must still be an owned draft'; end if;
end;
$$;

create or replace function public.dm_send_notification(target_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare recipient_id uuid;
begin
  if not public.has_role('DM') or not public.has_permission('NOTIFICATION_MANAGE') then
    raise exception using errcode = '42501', message = 'Notification management permission required';
  end if;
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;
  perform 1 from public.thong_bao tb
  where tb.id = target_notification_id and tb.nguoi_tao_id = auth.uid() and tb.trang_thai = 'CHƯA_GỬI'
  for update;
  if not found then raise exception using errcode = '22023', message = 'Notification must be an owned draft'; end if;
  if not exists (select 1 from public.thong_bao_nguoi_nhan where thong_bao_id = target_notification_id) then
    raise exception using errcode = '22023', message = 'Notification has no recipients';
  end if;
  for recipient_id in select tai_khoan_id from public.thong_bao_nguoi_nhan where thong_bao_id = target_notification_id loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient left DM scope';
    end if;
  end loop;
  update public.thong_bao set trang_thai = 'ĐÃ_GỬI' where id = target_notification_id;
end;
$$;

revoke all on function public.dm_create_notification(text, text, text, uuid[]) from public, anon;
revoke all on function public.dm_update_notification_draft(uuid, text, text, text, uuid[]) from public, anon;
revoke all on function public.dm_delete_notification_draft(uuid) from public, anon;
revoke all on function public.dm_send_notification(uuid) from public, anon;
grant execute on function public.dm_create_notification(text, text, text, uuid[]) to authenticated;
grant execute on function public.dm_update_notification_draft(uuid, text, text, text, uuid[]) to authenticated;
grant execute on function public.dm_delete_notification_draft(uuid) to authenticated;
grant execute on function public.dm_send_notification(uuid) to authenticated;
