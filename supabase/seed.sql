-- Phase 1 deterministic foundation seed.
-- No production users, passwords, service-role keys, or credentials are stored here.

insert into public.vai_tro (id, ma_vai_tro, ten_vai_tro, mo_ta)
values
  ('10000000-0000-0000-0000-000000000001', 'ADMIN', 'Quản trị viên', 'Quản trị tài khoản, vai trò và quyền.'),
  ('10000000-0000-0000-0000-000000000002', 'DM', 'Trưởng phòng kinh doanh', 'Quản lý cây nhân sự và hoạt động trong phạm vi phòng.'),
  ('10000000-0000-0000-0000-000000000003', 'UM', 'Trưởng nhóm kinh doanh', 'Quản lý cây nhân sự và hoạt động trong phạm vi nhóm.'),
  ('10000000-0000-0000-0000-000000000004', 'SA', 'Đại lý kinh doanh', 'Quản lý khách hàng và hoạt động của chính mình.')
on conflict (ma_vai_tro) do update
set ten_vai_tro = excluded.ten_vai_tro,
    mo_ta = excluded.mo_ta;

-- Maps to UC 4.2: DM/UM may read activity for accounts in their subordinate tree.
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

insert into public.phan_quyen_vai_tro (id, vai_tro_id, quyen_id, nguoi_gan_id)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    null
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    null
  )
on conflict (vai_tro_id, quyen_id) do nothing;
