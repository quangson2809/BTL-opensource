-- Phase 7: scoped reporting/statistics MVP.
-- Reporting returns aggregates only. It intentionally does not expose raw
-- subordinate customer rows and executes under the caller JWT.

create or replace function public.report_scope(
  period_start timestamptz,
  period_end timestamptz
)
returns table (
  account_id uuid,
  ho_ten text,
  ma_dai_ly text,
  is_self boolean,
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
    raise exception using errcode = '42501', message = 'Active password-authenticated application session required';
  end if;

  if period_start is null or period_end is null or period_start >= period_end then
    raise exception using errcode = '22023', message = 'Invalid report period';
  end if;

  return query
  select
    tk.id as account_id,
    tk.ho_ten,
    tk.ma_dai_ly,
    tk.id = auth.uid() as is_self,
    (
      select count(*)
      from public.khach_hang kh
      where kh.chu_so_huu_id = tk.id
        and kh.created_at >= period_start
        and kh.created_at < period_end
    )::bigint as customer_count,
    (
      select count(*)
      from public.hoat_dong hd
      where hd.tai_khoan_id = tk.id
        and hd.thoi_gian >= period_start
        and hd.thoi_gian < period_end
    )::bigint as activity_count,
    (
      select coalesce(sum(hd.so_khach_hang_ket_noi), 0)
      from public.hoat_dong hd
      where hd.tai_khoan_id = tk.id
        and hd.thoi_gian >= period_start
        and hd.thoi_gian < period_end
    )::bigint as connected_customer_count
  from public.tai_khoan tk
  where
    tk.id = auth.uid()
    or (
      (public.has_role('DM') or public.has_role('UM'))
      and public.is_in_subtree(tk.id)
    )
  order by
    case when tk.id = auth.uid() then 0 else 1 end,
    tk.ho_ten,
    tk.id;
end;
$$;

revoke all on function public.report_scope(timestamptz, timestamptz) from public;
grant execute on function public.report_scope(timestamptz, timestamptz) to authenticated;
