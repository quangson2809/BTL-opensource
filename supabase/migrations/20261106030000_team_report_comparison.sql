-- Current UM groups form a disjoint forest inside the caller's report scope.
-- Nested UMs belong to the outermost visible UM; direct staff outside a UM
-- group remain in personal/overview reports and are not silently reassigned.
create or replace function public.report_team_scope(period_start timestamptz, period_end timestamptz)
returns table(team_id uuid, team_name text, team_code text, member_count bigint, customer_count bigint, activity_count bigint)
language plpgsql stable security definer set search_path=pg_catalog,public
as $$
declare is_dm boolean := public.has_role('DM'); is_um boolean := public.has_role('UM');
begin
  if not public.current_account_has_application_access() or not (is_dm or is_um) then
    raise exception using errcode='42501', message='Active manager session required';
  end if;
  if period_start is null or period_end is null or period_start>=period_end then
    raise exception using errcode='22023', message='Invalid report period';
  end if;
  return query
  with recursive scoped as materialized (
    select * from public.report_scope(period_start,period_end)
  ), candidates as (
    select t.id,t.ho_ten,t.ma_dai_ly,t.manager_id
    from public.tai_khoan t join scoped s on s.account_id=t.id
    where (t.id<>auth.uid() or (is_um and not is_dm))
      and exists(select 1 from public.phan_cong_vai_tro pc join public.vai_tro v on v.id=pc.vai_tro_id where pc.tai_khoan_id=t.id and v.ma_vai_tro='UM')
  ), ancestors(candidate_id,ancestor_id,path) as (
    select c.id,c.manager_id,array[c.id,c.manager_id]
    from candidates c join scoped s on s.account_id=c.manager_id
    union all
    select a.candidate_id,t.manager_id,a.path||t.manager_id
    from ancestors a join public.tai_khoan t on t.id=a.ancestor_id
    join scoped s on s.account_id=t.manager_id
    where not t.manager_id=any(a.path)
  ), roots as (
    select c.* from candidates c
    where not exists(select 1 from ancestors a join candidates p on p.id=a.ancestor_id where a.candidate_id=c.id and p.id<>c.id)
  ), members(root_id,account_id,path) as (
    select r.id,r.id,array[r.id] from roots r
    union all
    select m.root_id,t.id,m.path||t.id
    from members m join public.tai_khoan t on t.manager_id=m.account_id
    join scoped s on s.account_id=t.id
    where not t.id=any(m.path)
  )
  select r.id,r.ho_ten,r.ma_dai_ly,count(*)::bigint,
    coalesce(sum(s.customer_count),0)::bigint,coalesce(sum(s.activity_count),0)::bigint
  from roots r join members m on m.root_id=r.id join scoped s on s.account_id=m.account_id
  group by r.id,r.ho_ten,r.ma_dai_ly order by r.ho_ten,r.id;
end;
$$;
revoke all on function public.report_team_scope(timestamptz,timestamptz) from public,anon;
grant execute on function public.report_team_scope(timestamptz,timestamptz) to authenticated;
