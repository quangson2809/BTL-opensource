-- Review fixes: production-required RBAC catalog and reporting timestamp integrity.
-- The RBAC catalog is application infrastructure, so it must be installed by
-- migrations rather than relying on local/CI seed execution.

insert into public.vai_tro (id, ma_vai_tro, ten_vai_tro, mo_ta)
values
  ('10000000-0000-0000-0000-000000000001', 'ADMIN', 'Quản trị viên', 'Quản trị tài khoản, vai trò và quyền.'),
  ('10000000-0000-0000-0000-000000000002', 'DM', 'Trưởng phòng kinh doanh', 'Quản lý cây nhân sự và hoạt động trong phạm vi phòng.'),
  ('10000000-0000-0000-0000-000000000003', 'UM', 'Trưởng nhóm kinh doanh', 'Quản lý cây nhân sự và hoạt động trong phạm vi nhóm.'),
  ('10000000-0000-0000-0000-000000000004', 'SA', 'Đại lý kinh doanh', 'Quản lý khách hàng và hoạt động của chính mình.')
on conflict (ma_vai_tro) do update
set ten_vai_tro = excluded.ten_vai_tro,
    mo_ta = excluded.mo_ta;

insert into public.quyen (id, ma_quyen, ten_quyen, mo_ta)
values (
  '20000000-0000-0000-0000-000000000001',
  'ACTIVITY_VIEW_SUBTREE',
  'Xem hoạt động cấp dưới',
  'Cho phép xem hoạt động của các tài khoản trong cây cấp dưới.'
)
on conflict (ma_quyen) do update
set ten_quyen = excluded.ten_quyen,
    mo_ta = excluded.mo_ta;

insert into public.phan_quyen_vai_tro (vai_tro_id, quyen_id, nguoi_gan_id)
select vt.id, q.id, null
from public.vai_tro vt
cross join public.quyen q
where vt.ma_vai_tro in ('DM', 'UM')
  and q.ma_quyen = 'ACTIVITY_VIEW_SUBTREE'
on conflict (vai_tro_id, quyen_id) do nothing;

-- Reporting counts "new customers" by khach_hang.created_at. Authenticated
-- application callers must not be able to backdate/forward-date that source
-- timestamp. Inserts always receive database time; subsequent authenticated
-- writes cannot change it. Privileged migration/fixture sessions remain able to
-- create historical fixtures because they do not carry an application auth.uid().
create or replace function public.protect_khach_hang_created_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.created_at = now();
    elsif new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '42501',
        message = 'khach_hang.created_at is immutable for application writes';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_khach_hang_created_at_integrity on public.khach_hang;
create trigger trg_khach_hang_created_at_integrity
before insert or update on public.khach_hang
for each row execute function public.protect_khach_hang_created_at();
