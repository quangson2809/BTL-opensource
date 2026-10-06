begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

-- Required application catalog must exist from migrations even when seed.sql is
-- intentionally a no-op.
select is(
  (
    select count(*)::bigint
    from public.vai_tro
    where ma_vai_tro in ('ADMIN', 'DM', 'UM', 'SA')
  ),
  4::bigint,
  'production-required role catalog is migration-owned'
);

select is(
  (
    select count(*)::bigint
    from public.phan_quyen_vai_tro pqvt
    join public.vai_tro vt on vt.id = pqvt.vai_tro_id
    join public.quyen q on q.id = pqvt.quyen_id
    where vt.ma_vai_tro in ('DM', 'UM')
      and q.ma_quyen = 'ACTIVITY_VIEW_SUBTREE'
  ),
  2::bigint,
  'DM/UM subtree permission mappings are migration-owned'
);

insert into auth.users (id, email)
values
  ('c8000000-0000-4000-8000-000000000001', 'review-sa@example.test'),
  ('c8000000-0000-4000-8000-000000000002', 'review-otp-dm@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('c8000000-0000-4000-8000-000000000001', 'Review SA', 'review-sa@example.test', '0980000001', 'REVIEW-SA', null, 'DANG_HOAT_DONG'),
  ('c8000000-0000-4000-8000-000000000002', 'Review OTP DM', 'review-otp-dm@example.test', '0980000002', 'REVIEW-OTP-DM', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c8000000-0000-4000-8000-000000000001', id
from public.vai_tro
where ma_vai_tro = 'SA';

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c8000000-0000-4000-8000-000000000002', id
from public.vai_tro
where ma_vai_tro = 'DM';

-- Historical fixture inserted by privileged migration/test context. Authenticated
-- application writes must not be able to move this timestamp between periods.
insert into public.khach_hang (
  id, chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
  ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang,
  nhom_tinh_cach, created_at
)
values (
  'c8100000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001',
  'REVIEW-KH-OLD',
  'Khách lịch sử',
  '0981000001',
  'Nam',
  '1990-01-01',
  'Hà Nội',
  'Đọc sách',
  'Historical report fixture',
  'MUC_TIEU',
  'BẠN',
  'D',
  '2026-10-01T03:00:00Z'
);

-- Real notification/recipient fixture for discriminating OTP-only helper tests.
insert into public.thong_bao (
  id, nguoi_tao_id, tieu_de, noi_dung, loai, trang_thai
)
values (
  'c8300000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000002',
  'OTP helper fixture',
  'Sent fixture for AMR boundary',
  'TIN_TỨC',
  'ĐÃ_GỬI'
);

insert into public.thong_bao_nguoi_nhan (
  id, thong_bao_id, tai_khoan_id, da_doc
)
values (
  'c8400000-0000-4000-8000-000000000001',
  'c8300000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000002',
  false
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c8000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c8000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select throws_ok(
  $$
    update public.khach_hang
    set created_at = '2026-10-06T03:00:00Z'
    where id = 'c8100000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'khach_hang.created_at is immutable for application writes',
  'owner direct update cannot move customer created_at into another report period'
);

select results_eq(
  $$
    select customer_count
    from public.report_scope(
      '2026-10-05T17:00:00Z',
      '2026-10-06T17:00:00Z'
    )
    where is_self
  $$,
  $$ values (0::bigint) $$,
  'failed timestamp update does not move historical customer into current-day report'
);

select results_eq(
  $$
    select customer_count
    from public.report_scope(
      '2026-09-30T17:00:00Z',
      '2026-10-01T17:00:00Z'
    )
    where is_self
  $$,
  $$ values (1::bigint) $$,
  'historical customer remains counted in original report period'
);

select lives_ok(
  $$
    insert into public.khach_hang (
      id, chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
      ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang,
      nhom_tinh_cach, created_at
    )
    values (
      'c8100000-0000-4000-8000-000000000002',
      'c8000000-0000-4000-8000-000000000001',
      'REVIEW-KH-FORGED',
      'Khách tạo mới',
      '0981000002',
      'Nữ',
      '1991-01-01',
      'Hà Nội',
      'Du lịch',
      'Forged timestamp attempt',
      'NUOI_DUONG',
      'BÀN',
      'I',
      '2000-01-01T00:00:00Z'
    )
  $$,
  'owner may create customer while database controls created_at'
);

select ok(
  (
    select created_at >= now() - interval '1 minute'
    from public.khach_hang
    where id = 'c8100000-0000-4000-8000-000000000002'
  ),
  'authenticated insert cannot backdate customer created_at'
);

-- OTP-only claims must fail on real matching SECURITY DEFINER paths, not merely
-- on nonexistent UUIDs.
select set_config('request.jwt.claim.sub', 'c8000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c8000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'otp', 'timestamp', 0))
  )::text,
  true
);

select is(
  public.can_creator_read_notification_recipient(
    'c8300000-0000-4000-8000-000000000001'
  ),
  false,
  'OTP-only creator cannot use real notification helper path'
);

select is(
  public.can_recipient_read_sent_notification(
    'c8300000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000002'
  ),
  false,
  'OTP-only recipient cannot use real sent-notification helper path'
);

select throws_ok(
  $$
    select *
    from public.report_scope(
      '2026-10-05T17:00:00Z',
      '2026-10-06T17:00:00Z'
    )
  $$,
  '42501',
  'Active password-authenticated application session required',
  'OTP-only account cannot call reporting SECURITY DEFINER RPC'
);

reset role;

select is(
  (
    select created_at
    from public.khach_hang
    where id = 'c8100000-0000-4000-8000-000000000001'
  ),
  '2026-10-01T03:00:00Z'::timestamptz,
  'historical customer created_at remains unchanged after denied owner update'
);

select * from finish();
rollback;
