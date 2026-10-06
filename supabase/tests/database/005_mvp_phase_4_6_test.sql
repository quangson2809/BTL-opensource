begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, email)
values
  ('b4000000-0000-4000-8000-000000000001', 'batch-dm@example.test'),
  ('b4000000-0000-4000-8000-000000000002', 'batch-sa@example.test'),
  ('b4000000-0000-4000-8000-000000000003', 'batch-outsider@example.test'),
  ('b4000000-0000-4000-8000-000000000004', 'batch-pending@example.test'),
  ('b4000000-0000-4000-8000-000000000005', 'batch-admin@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('b4000000-0000-4000-8000-000000000001', 'Batch DM', 'batch-dm@example.test', '0940000001', 'BATCH-DM', null, 'DANG_HOAT_DONG'),
  ('b4000000-0000-4000-8000-000000000002', 'Batch SA', 'batch-sa@example.test', '0940000002', 'BATCH-SA', 'b4000000-0000-4000-8000-000000000001', 'DANG_HOAT_DONG'),
  ('b4000000-0000-4000-8000-000000000003', 'Batch Outsider', 'batch-outsider@example.test', '0940000003', 'BATCH-OUT', null, 'DANG_HOAT_DONG'),
  ('b4000000-0000-4000-8000-000000000004', 'Batch Pending', 'batch-pending@example.test', '0940000004', 'BATCH-PENDING', null, 'CHO_PHE_DUYET'),
  ('b4000000-0000-4000-8000-000000000005', 'Batch Admin', 'batch-admin@example.test', '0940000005', 'BATCH-ADMIN', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000001', id from public.vai_tro where ma_vai_tro = 'DM';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000002', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000003', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000004', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000005', id from public.vai_tro where ma_vai_tro = 'ADMIN';

insert into public.khach_hang (
  id, chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
  ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang, nhom_tinh_cach
)
values
  ('b4100000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000002', 'BATCH-KH-1', 'Khách batch', '0950000001', 'Nam', '1990-01-01', 'Hà Nội', 'Đọc sách', 'Batch', 'MUC_TIEU', 'BẠN', 'D');

insert into public.hoat_dong (
  id, tai_khoan_id, loai_hoat_dong, dia_diem, thoi_gian, so_khach_hang_ket_noi
)
values
  ('b4200000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000002', 'TƯ_VẤN', 'Hà Nội', now(), 3);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Phase 4 customer ownership and personnel aggregate boundary.
select set_config('request.jwt.claim.sub', 'b4000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'b4000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select lives_ok(
  $$
    insert into public.khach_hang (
      chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
      ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang, nhom_tinh_cach
    ) values (
      'b4000000-0000-4000-8000-000000000002', 'BATCH-KH-2', 'Khách mới', '0950000002', 'Nữ',
      '1992-02-02', 'Hà Nội', 'Du lịch', 'Own row', 'NUOI_DUONG', 'BÀN', 'I'
    )
  $$,
  'SA can create an owned customer'
);

select lives_ok(
  $$
    delete from public.khach_hang
    where ma_khach_hang = 'BATCH-KH-2'
  $$,
  'SA can delete an owned customer'
);

select throws_ok(
  $$ select * from public.personnel_summary('b4000000-0000-4000-8000-000000000003') $$,
  '42501',
  null,
  'SA cannot request personnel summary outside own account'
);

-- DM may read only aggregates for subordinate customer data.
select set_config('request.jwt.claim.sub', 'b4000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'b4000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(
  (select count(*)::bigint from public.khach_hang),
  0::bigint,
  'DM still cannot read subordinate customer rows'
);

select results_eq(
  $$ select customer_count, activity_count, connected_customer_count from public.personnel_summary('b4000000-0000-4000-8000-000000000002') $$,
  $$ values (1::bigint, 1::bigint, 3::bigint) $$,
  'DM receives only subordinate customer/activity aggregate summary'
);

select throws_ok(
  $$ select * from public.personnel_summary('b4000000-0000-4000-8000-000000000003') $$,
  '42501',
  null,
  'DM cannot summarize an account outside subtree'
);

-- Phase 5 manager read does not become manager mutation.
select ok(
  exists (select 1 from public.hoat_dong where id = 'b4200000-0000-4000-8000-000000000001'),
  'DM can read subordinate activity'
);

select results_eq(
  $$
    update public.hoat_dong
    set dia_diem = 'Forbidden'
    where id = 'b4200000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'DM cannot update subordinate activity'
);

-- Phase 6 DM creates a draft for a scoped recipient.
select lives_ok(
  $$
    select public.dm_create_notification(
      'Batch draft',
      'Draft content',
      'TIN_TỨC',
      array['b4000000-0000-4000-8000-000000000002'::uuid]
    )
  $$,
  'DM can create notification draft for subtree recipient'
);

select throws_ok(
  $$
    select public.dm_create_notification(
      'Out of scope',
      'Forbidden recipient',
      'TIN_TỨC',
      array['b4000000-0000-4000-8000-000000000003'::uuid]
    )
  $$,
  '42501',
  null,
  'DM cannot create notification for recipient outside subtree'
);

-- Recipient cannot see the draft before send.
select set_config('request.jwt.claim.sub', 'b4000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'b4000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(
  (select count(*)::bigint from public.thong_bao where tieu_de = 'Batch draft'),
  0::bigint,
  'recipient cannot read a draft notification'
);

select is(
  (select count(*)::bigint from public.thong_bao_nguoi_nhan),
  0::bigint,
  'recipient cannot read draft recipient row'
);

select throws_ok(
  $$
    select public.dm_create_notification(
      'SA forbidden',
      'No DM role',
      'TIN_TỨC',
      array['b4000000-0000-4000-8000-000000000002'::uuid]
    )
  $$,
  '42501',
  null,
  'SA cannot create DM notification'
);

-- DM sends the draft.
select set_config('request.jwt.claim.sub', 'b4000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'b4000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select lives_ok(
  $$
    select public.dm_send_notification(
      (select id from public.thong_bao where tieu_de = 'Batch draft')
    )
  $$,
  'DM can send owned draft notification'
);

-- Sent recipient can read and mark read.
select set_config('request.jwt.claim.sub', 'b4000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'b4000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(
  (select count(*)::bigint from public.thong_bao where tieu_de = 'Batch draft'),
  1::bigint,
  'recipient can read notification after send'
);

update public.thong_bao_nguoi_nhan
set da_doc = true
where thong_bao_id = (select id from public.thong_bao where tieu_de = 'Batch draft');

select is(
  (select da_doc from public.thong_bao_nguoi_nhan limit 1),
  true,
  'recipient can mark sent notification as read'
);

-- Phase 3 reviewer LOW regression: direct lifecycle RPC denied paths and invalid transitions.
select throws_ok(
  $$ select public.admin_approve_account('b4000000-0000-4000-8000-000000000004') $$,
  '42501',
  null,
  'non-Admin cannot call approve lifecycle RPC'
);
select throws_ok(
  $$ select public.admin_lock_account('b4000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'non-Admin cannot call lock lifecycle RPC'
);
select throws_ok(
  $$ select public.admin_unlock_account('b4000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'non-Admin cannot call unlock lifecycle RPC'
);

-- Admin still cannot use lifecycle RPCs for invalid state transitions.
select set_config('request.jwt.claim.sub', 'b4000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'b4000000-0000-4000-8000-000000000005',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select throws_ok(
  $$ select public.admin_approve_account('b4000000-0000-4000-8000-000000000002') $$,
  '22023',
  null,
  'Admin cannot approve an already-active account'
);
select throws_ok(
  $$ select public.admin_lock_account('b4000000-0000-4000-8000-000000000004') $$,
  '22023',
  null,
  'Admin cannot lock a pending account'
);
select throws_ok(
  $$ select public.admin_unlock_account('b4000000-0000-4000-8000-000000000002') $$,
  '22023',
  null,
  'Admin cannot unlock an already-active account'
);

reset role;
select * from finish();
rollback;
