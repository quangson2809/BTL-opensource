-- MVP batch: Phase 4 Customer/Personnel, Phase 5 Activity, Phase 6 Notification.
-- Scope is limited to requirements already recorded in PROJECT_PLAN.md and
-- source-derived Phase 1 authorization contracts. Notification edit/delete
-- remains deferred because its business rule is still unresolved in Decision Log.

-- Phase 4: managers may view aggregate customer/activity statistics for an
-- account in their subtree without receiving access to subordinate customer rows.
create or replace function public.personnel_summary(target_account_id uuid)
returns table (
  customer_count bigint,
  activity_count bigint,
  connected_customer_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.current_account_has_application_access() then
    raise exception using errcode = '42501', message = 'Active application session required';
  end if;

  if target_account_id <> auth.uid()
     and not (
       (public.has_role('DM') or public.has_role('UM'))
       and public.is_in_subtree(target_account_id)
     ) then
    raise exception using errcode = '42501', message = 'Personnel scope denied';
  end if;

  return query
  select
    (select count(*) from public.khach_hang kh where kh.chu_so_huu_id = target_account_id),
    (select count(*) from public.hoat_dong hd where hd.tai_khoan_id = target_account_id),
    (select coalesce(sum(hd.so_khach_hang_ket_noi), 0)::bigint
       from public.hoat_dong hd
      where hd.tai_khoan_id = target_account_id);
end;
$$;

revoke all on function public.personnel_summary(uuid) from public;
grant execute on function public.personnel_summary(uuid) to authenticated;

-- Phase 6: recipients must not see draft notifications. Creators may inspect
-- their own recipient rows while recipients only gain access after send.
drop policy if exists thong_bao_select_creator_or_recipient on public.thong_bao;
create policy thong_bao_select_creator_or_sent_recipient
on public.thong_bao
for select
to authenticated
using (
  nguoi_tao_id = auth.uid()
  or (
    trang_thai = 'ĐÃ_GỬI'
    and exists (
      select 1
      from public.thong_bao_nguoi_nhan tbn
      where tbn.thong_bao_id = thong_bao.id
        and tbn.tai_khoan_id = auth.uid()
    )
  )
);

drop policy if exists thong_bao_nguoi_nhan_select_own on public.thong_bao_nguoi_nhan;
create policy thong_bao_nguoi_nhan_select_scope
on public.thong_bao_nguoi_nhan
for select
to authenticated
using (
  exists (
    select 1
    from public.thong_bao tb
    where tb.id = thong_bao_nguoi_nhan.thong_bao_id
      and (
        tb.nguoi_tao_id = auth.uid()
        or (
          thong_bao_nguoi_nhan.tai_khoan_id = auth.uid()
          and tb.trang_thai = 'ĐÃ_GỬI'
        )
      )
  )
);

drop policy if exists thong_bao_nguoi_nhan_update_own on public.thong_bao_nguoi_nhan;
create policy thong_bao_nguoi_nhan_update_sent_own
on public.thong_bao_nguoi_nhan
for update
to authenticated
using (
  tai_khoan_id = auth.uid()
  and exists (
    select 1
    from public.thong_bao tb
    where tb.id = thong_bao_nguoi_nhan.thong_bao_id
      and tb.trang_thai = 'ĐÃ_GỬI'
  )
)
with check (
  tai_khoan_id = auth.uid()
  and exists (
    select 1
    from public.thong_bao tb
    where tb.id = thong_bao_nguoi_nhan.thong_bao_id
      and tb.trang_thai = 'ĐÃ_GỬI'
  )
);

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
  if not public.has_role('DM') then
    raise exception using errcode = '42501', message = 'DM role required';
  end if;

  if nullif(btrim(notification_title), '') is null
     or nullif(btrim(notification_content), '') is null then
    raise exception using errcode = '22023', message = 'Notification title and content are required';
  end if;

  if notification_type not in ('TIN_TỨC', 'TỰ_ĐỘNG_HỆ_THỐNG') then
    raise exception using errcode = '22023', message = 'Invalid notification type';
  end if;

  if recipient_ids is null or cardinality(recipient_ids) = 0 then
    raise exception using errcode = '22023', message = 'At least one recipient is required';
  end if;

  foreach recipient_id in array recipient_ids loop
    if recipient_id is null or not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient is outside DM scope';
    end if;
  end loop;

  insert into public.thong_bao (
    nguoi_tao_id,
    tieu_de,
    noi_dung,
    loai,
    trang_thai
  )
  values (
    auth.uid(),
    btrim(notification_title),
    btrim(notification_content),
    notification_type,
    'CHƯA_GỬI'
  )
  returning id into notification_id;

  insert into public.thong_bao_nguoi_nhan (thong_bao_id, tai_khoan_id)
  select notification_id, recipient_id
  from (
    select distinct unnest(recipient_ids) as recipient_id
  ) recipients;

  return notification_id;
end;
$$;

create or replace function public.dm_send_notification(target_notification_id uuid)
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
    raise exception using errcode = '22023', message = 'Notification must be an owned draft';
  end if;

  if not exists (
    select 1 from public.thong_bao_nguoi_nhan tbn
    where tbn.thong_bao_id = target_notification_id
  ) then
    raise exception using errcode = '22023', message = 'Notification has no recipients';
  end if;

  for recipient_id in
    select tbn.tai_khoan_id
    from public.thong_bao_nguoi_nhan tbn
    where tbn.thong_bao_id = target_notification_id
  loop
    if not public.is_in_subtree(recipient_id) then
      raise exception using errcode = '42501', message = 'Notification recipient left DM scope';
    end if;
  end loop;

  update public.thong_bao
  set trang_thai = 'ĐÃ_GỬI'
  where id = target_notification_id;
end;
$$;

revoke all on function public.dm_create_notification(text, text, text, uuid[]) from public;
revoke all on function public.dm_send_notification(uuid) from public;
grant execute on function public.dm_create_notification(text, text, text, uuid[]) to authenticated;
grant execute on function public.dm_send_notification(uuid) to authenticated;
