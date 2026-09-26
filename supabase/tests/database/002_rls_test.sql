begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

-- Test identities. Business-account IDs are exactly the matching auth.users IDs.
insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'admin@example.test'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'admin2@example.test'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'dm@example.test'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'um@example.test'),
  ('11111111-1111-4111-8111-111111111111', 'sa@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'other-sa@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Admin One', 'admin@example.test', '0900000001', 'ADMIN-001', null, 'DANG_HOAT_DONG'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Admin Two', 'admin2@example.test', '0900000002', 'ADMIN-002', null, 'DANG_HOAT_DONG'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'DM Test', 'dm@example.test', '0900000003', 'DM-001', null, 'DANG_HOAT_DONG'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'UM Test', 'um@example.test', '0900000004', 'UM-001', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'DANG_HOAT_DONG'),
  ('11111111-1111-4111-8111-111111111111', 'SA Test', 'sa@example.test', '0900000005', 'SA-001', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'DANG_HOAT_DONG'),
  ('22222222-2222-4222-8222-222222222222', 'Other SA', 'other-sa@example.test', '0900000006', 'SA-002', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', id from public.vai_tro where ma_vai_tro = 'ADMIN';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', id from public.vai_tro where ma_vai_tro = 'ADMIN';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', id from public.vai_tro where ma_vai_tro = 'DM';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', id from public.vai_tro where ma_vai_tro = 'UM';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select '11111111-1111-4111-8111-111111111111', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select '22222222-2222-4222-8222-222222222222', id from public.vai_tro where ma_vai_tro = 'SA';

insert into public.khach_hang (
  id, chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
  ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang, nhom_tinh_cach
)
values
  ('40000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'KH-SA-001', 'Khách SA', '0910000001', 'Nam', '1990-01-01', 'Hà Nội', 'Đọc sách', 'Ghi chú SA', 'MUC_TIEU', 'BẠN', 'D'),
  ('40000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'KH-OTHER-001', 'Khách khác', '0910000002', 'Nữ', '1991-02-02', 'Hà Nội', 'Du lịch', 'Ghi chú khác', 'NUOI_DUONG', 'BÀN', 'I');

insert into public.hoat_dong (
  id, tai_khoan_id, loai_hoat_dong, dia_diem, thoi_gian, so_khach_hang_ket_noi
)
values
  ('50000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'KHẢO_SÁT', 'Hà Nội', '2026-09-26T08:00:00+07:00', 2),
  ('50000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'GẶP_GỠ', 'Hà Nội', '2026-09-26T09:00:00+07:00', 1);

insert into public.thong_bao (
  id, nguoi_tao_id, tieu_de, noi_dung, loai, trang_thai
)
values
  ('60000000-0000-4000-8000-000000000001', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Thông báo cho SA', 'Nội dung thử nghiệm', 'TIN_TỨC', 'ĐÃ_GỬI'),
  ('60000000-0000-4000-8000-000000000002', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Thông báo khác', 'Không gửi cho SA Test', 'TIN_TỨC', 'ĐÃ_GỬI');

insert into public.thong_bao_nguoi_nhan (id, thong_bao_id, tai_khoan_id, da_doc)
values
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', false),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', false),
  ('70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', false);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- SA identity.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select is(
  (select count(*)::bigint from public.khach_hang),
  1::bigint,
  'customer owner can read only their own customer rows'
);

select ok(
  exists (select 1 from public.khach_hang where ma_khach_hang = 'KH-SA-001'),
  'customer owner can read own customer'
);

select ok(
  not exists (select 1 from public.khach_hang where ma_khach_hang = 'KH-OTHER-001'),
  'customer owner cannot read another account customer'
);

update public.khach_hang
set ghi_chu = 'Owner updated'
where id = '40000000-0000-4000-8000-000000000001';

select is(
  (select ghi_chu from public.khach_hang where id = '40000000-0000-4000-8000-000000000001'),
  'Owner updated'::text,
  'customer owner can update own customer'
);

select results_eq(
  $
    update public.khach_hang
    set ghi_chu = 'Forbidden update'
    where id = '40000000-0000-4000-8000-000000000002'
    returning id
  $,
  $ select null::uuid where false $,
  'customer owner cannot update another account customer'
);

select throws_ok(
  $$
    insert into public.khach_hang (
      chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
      ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang, nhom_tinh_cach
    ) values (
      '22222222-2222-4222-8222-222222222222', 'KH-FORBIDDEN', 'Sai owner', '0910000099', 'Nam',
      '1992-03-03', 'Hà Nội', 'Không', 'Không', 'MUC_TIEU', 'BẠN', 'S'
    )
  $$,
  '42501',
  null,
  'user cannot create a customer owned by another account'
);

select lives_ok(
  $$
    insert into public.khach_hang (
      chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
      ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang, nhom_tinh_cach
    ) values (
      '11111111-1111-4111-8111-111111111111', 'KH-SA-002', 'Khách mới', '0910000003', 'Nam',
      '1993-04-04', 'Hà Nội', 'Thể thao', 'Own insert', 'DOI_TAC', 'BÁM', 'C'
    )
  $$,
  'user can create a customer they own'
);

select is(
  (select count(*)::bigint from public.hoat_dong),
  1::bigint,
  'SA reads only own activity without subtree permission'
);

select ok(
  exists (select 1 from public.hoat_dong where id = '50000000-0000-4000-8000-000000000001'),
  'SA can read own activity'
);

select ok(
  not exists (select 1 from public.hoat_dong where id = '50000000-0000-4000-8000-000000000002'),
  'SA cannot read unrelated activity'
);

select is(
  (select count(*)::bigint from public.thong_bao_nguoi_nhan),
  1::bigint,
  'recipient can read only their own recipient row'
);

select ok(
  exists (select 1 from public.thong_bao where id = '60000000-0000-4000-8000-000000000001'),
  'recipient can read a notification addressed to them'
);

select ok(
  not exists (select 1 from public.thong_bao where id = '60000000-0000-4000-8000-000000000002'),
  'recipient cannot read a notification not addressed to them'
);

update public.thong_bao_nguoi_nhan
set da_doc = true
where id = '70000000-0000-4000-8000-000000000001';

select ok(
  (select da_doc from public.thong_bao_nguoi_nhan where id = '70000000-0000-4000-8000-000000000001'),
  'recipient can update own read state'
);

select throws_ok(
  $$
    update public.thong_bao_nguoi_nhan
    set tai_khoan_id = '22222222-2222-4222-8222-222222222222'
    where id = '70000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'recipient cannot change recipient identity columns'
);

select throws_ok(
  $$
    insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
    select '11111111-1111-4111-8111-111111111111', id
    from public.vai_tro
    where ma_vai_tro = 'ADMIN'
  $$,
  '42501',
  null,
  'normal user cannot self-grant ADMIN role'
);

select results_eq(
  $
    update public.quyen
    set ten_quyen = 'Unauthorized change'
    where ma_quyen = 'ACTIVITY_VIEW_SUBTREE'
    returning id
  $,
  $ select null::uuid where false $,
  'normal user cannot modify permission catalog'
);

-- ADMIN must not bypass customer ownership.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', true);

select is(
  (select count(*)::bigint from public.khach_hang),
  0::bigint,
  'ADMIN does not bypass customer ownership'
);

select lives_ok(
  $$
    insert into public.quyen (ma_quyen, ten_quyen, mo_ta)
    values ('TEST_ADMIN_PERMISSION', 'Test admin permission', 'Only created inside rollback-only RLS test')
  $$,
  'authorized ADMIN can write the permission catalog'
);

-- Recursive hierarchy: DM -> UM -> SA. DM/UM seed roles carry ACTIVITY_VIEW_SUBTREE.
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);

select ok(
  exists (select 1 from public.hoat_dong where id = '50000000-0000-4000-8000-000000000001'),
  'DM can read descendant activity through recursive hierarchy'
);

select ok(
  not exists (select 1 from public.hoat_dong where id = '50000000-0000-4000-8000-000000000002'),
  'DM cannot read activity outside their subtree'
);

select results_eq(
  $
    update public.hoat_dong
    set dia_diem = 'Manager forbidden update'
    where id = '50000000-0000-4000-8000-000000000001'
    returning id
  $,
  $ select null::uuid where false $,
  'manager subtree read does not permit updating subordinate activity'
);

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', true);

select ok(
  exists (select 1 from public.hoat_dong where id = '50000000-0000-4000-8000-000000000001'),
  'UM can read direct subordinate activity'
);

reset role;
select * from finish();
rollback;
