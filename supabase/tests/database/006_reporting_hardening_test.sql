begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, email)
values
  ('c7000000-0000-4000-8000-000000000001', 'p79-dm@example.test'),
  ('c7000000-0000-4000-8000-000000000002', 'p79-sa@example.test'),
  ('c7000000-0000-4000-8000-000000000003', 'p79-out@example.test'),
  ('c7000000-0000-4000-8000-000000000004', 'p79-dm2@example.test'),
  ('c7000000-0000-4000-8000-000000000005', 'p79-pending@example.test'),
  ('c7000000-0000-4000-8000-000000000006', 'p79-locked@example.test'),
  ('c7000000-0000-4000-8000-000000000007', 'p79-otp@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('c7000000-0000-4000-8000-000000000001', 'P79 DM', 'p79-dm@example.test', '0970000001', 'P79-DM', null, 'DANG_HOAT_DONG'),
  ('c7000000-0000-4000-8000-000000000002', 'P79 SA', 'p79-sa@example.test', '0970000002', 'P79-SA', 'c7000000-0000-4000-8000-000000000001', 'DANG_HOAT_DONG'),
  ('c7000000-0000-4000-8000-000000000003', 'P79 Outside', 'p79-out@example.test', '0970000003', 'P79-OUT', null, 'DANG_HOAT_DONG'),
  ('c7000000-0000-4000-8000-000000000004', 'P79 DM Two', 'p79-dm2@example.test', '0970000004', 'P79-DM2', null, 'DANG_HOAT_DONG'),
  ('c7000000-0000-4000-8000-000000000005', 'P79 Pending DM', 'p79-pending@example.test', '0970000005', 'P79-PENDING', null, 'CHO_PHE_DUYET'),
  ('c7000000-0000-4000-8000-000000000006', 'P79 Locked DM', 'p79-locked@example.test', '0970000006', 'P79-LOCKED', null, 'KHOA'),
  ('c7000000-0000-4000-8000-000000000007', 'P79 OTP DM', 'p79-otp@example.test', '0970000007', 'P79-OTP', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select account_id, vt.id
from (
  values
    ('c7000000-0000-4000-8000-000000000001'::uuid, 'DM'::text),
    ('c7000000-0000-4000-8000-000000000002'::uuid, 'SA'::text),
    ('c7000000-0000-4000-8000-000000000003'::uuid, 'SA'::text),
    ('c7000000-0000-4000-8000-000000000004'::uuid, 'DM'::text),
    ('c7000000-0000-4000-8000-000000000005'::uuid, 'DM'::text),
    ('c7000000-0000-4000-8000-000000000006'::uuid, 'DM'::text),
    ('c7000000-0000-4000-8000-000000000007'::uuid, 'DM'::text)
) roles(account_id, role_code)
join public.vai_tro vt on vt.ma_vai_tro = roles.role_code;

insert into public.khach_hang (
  id, chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
  ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang,
  nhom_tinh_cach, created_at
)
values
  (
    'c7100000-0000-4000-8000-000000000001',
    'c7000000-0000-4000-8000-000000000002',
    'P79-KH-SA', 'Khách SA', '0971000001', 'Nam', '1990-01-01',
    'Hà Nội', 'Đọc sách', 'Report scope', 'MUC_TIEU', 'BẠN', 'D',
    '2026-10-06T03:00:00Z'
  ),
  (
    'c7100000-0000-4000-8000-000000000002',
    'c7000000-0000-4000-8000-000000000003',
    'P79-KH-OUT', 'Khách ngoài scope', '0971000002', 'Nữ', '1991-01-01',
    'Hà Nội', 'Du lịch', 'Outside scope', 'NUOI_DUONG', 'BÀN', 'I',
    '2026-10-06T03:00:00Z'
  );

insert into public.hoat_dong (
  id, tai_khoan_id, loai_hoat_dong, dia_diem, thoi_gian, so_khach_hang_ket_noi
)
values
  (
    'c7200000-0000-4000-8000-000000000001',
    'c7000000-0000-4000-8000-000000000002',
    'TƯ_VẤN', 'Hà Nội', '2026-10-06T04:00:00Z', 4
  ),
  (
    'c7200000-0000-4000-8000-000000000002',
    'c7000000-0000-4000-8000-000000000003',
    'GẶP_GỠ', 'Hà Nội', '2026-10-06T04:00:00Z', 9
  );

-- Fixed draft proves non-owner DM cannot send even when the target UUID is known.
insert into public.thong_bao (
  id, nguoi_tao_id, tieu_de, noi_dung, loai, trang_thai
)
values (
  'c7300000-0000-4000-8000-000000000001',
  'c7000000-0000-4000-8000-000000000001',
  'P79 fixed non-owner draft',
  'Known draft UUID',
  'TIN_TỨC',
  'CHƯA_GỬI'
);

insert into public.thong_bao_nguoi_nhan (
  id, thong_bao_id, tai_khoan_id, da_doc
)
values (
  'c7400000-0000-4000-8000-000000000001',
  'c7300000-0000-4000-8000-000000000001',
  'c7000000-0000-4000-8000-000000000002',
  false
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- DM report scope: self + subtree, never unrelated account.
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(
  (
    select count(*)::bigint
    from public.report_scope(
      '2026-10-05T17:00:00Z',
      '2026-10-06T17:00:00Z'
    )
  ),
  2::bigint,
  'DM report contains only self and subtree account'
);

select results_eq(
  $$
    select
      customer_count,
      activity_count,
      connected_customer_count
    from public.report_scope(
      '2026-10-05T17:00:00Z',
      '2026-10-06T17:00:00Z'
    )
    where account_id = 'c7000000-0000-4000-8000-000000000002'
  $$,
  $$ values (1::bigint, 1::bigint, 4::bigint) $$,
  'DM report aggregates subordinate data without raw customer access'
);

select ok(
  not exists (
    select 1
    from public.report_scope(
      '2026-10-05T17:00:00Z',
      '2026-10-06T17:00:00Z'
    )
    where account_id = 'c7000000-0000-4000-8000-000000000003'
  ),
  'DM report excludes unrelated account'
);

select throws_ok(
  $
    select *
    from public.report_scope('2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z')
  $,
  '22023',
  null,
  'report rejects invalid period'
);

-- SA reporting remains self-only.
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(
  (
    select count(*)::bigint
    from public.report_scope(
      '2026-10-05T17:00:00Z',
      '2026-10-06T17:00:00Z'
    )
  ),
  1::bigint,
  'SA report contains only self'
);

select ok(
  exists (
    select 1
    from public.report_scope(
      '2026-10-05T17:00:00Z',
      '2026-10-06T17:00:00Z'
    )
    where account_id = 'c7000000-0000-4000-8000-000000000002'
      and is_self
  ),
  'SA report row is bound to auth.uid'
);

-- Restore DM for manager and notification tests.
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

-- Manager can read subordinate activity but cannot delete it.
select results_eq(
  $$
    delete from public.hoat_dong
    where id = 'c7200000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'manager cannot delete subordinate activity'
);

-- DM creates a draft. Direct table writes remain unavailable.
select lives_ok(
  $$
    select public.dm_create_notification(
      'P79 owned draft',
      'Owned draft body',
      'TIN_TỨC',
      array['c7000000-0000-4000-8000-000000000002'::uuid]
    )
  $$,
  'DM can create an owned draft through RPC'
);

select throws_ok(
  $$
    insert into public.thong_bao (
      nguoi_tao_id, tieu_de, noi_dung, loai, trang_thai
    )
    values (
      'c7000000-0000-4000-8000-000000000001',
      'Direct insert',
      'Forbidden',
      'TIN_TỨC',
      'CHƯA_GỬI'
    )
  $$,
  '42501',
  null,
  'authenticated DM cannot directly insert notification row'
);

select throws_ok(
  $$
    update public.thong_bao
    set tieu_de = 'Direct update'
    where tieu_de = 'P79 owned draft'
  $$,
  '42501',
  null,
  'authenticated DM cannot directly update notification row'
);

select throws_ok(
  $$
    delete from public.thong_bao
    where tieu_de = 'P79 owned draft'
  $$,
  '42501',
  null,
  'authenticated DM cannot directly delete notification row'
);

select throws_ok(
  $$
    insert into public.thong_bao_nguoi_nhan (thong_bao_id, tai_khoan_id)
    select id, 'c7000000-0000-4000-8000-000000000003'
    from public.thong_bao
    where tieu_de = 'P79 owned draft'
  $$,
  '42501',
  null,
  'authenticated DM cannot directly insert recipient row'
);

select throws_ok(
  $$
    delete from public.thong_bao_nguoi_nhan
    where thong_bao_id = (
      select id from public.thong_bao where tieu_de = 'P79 owned draft'
    )
  $$,
  '42501',
  null,
  'authenticated DM cannot directly delete recipient row'
);

-- Another DM cannot publish somebody else's draft.
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000004', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000004',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select throws_ok(
  $
    select public.dm_send_notification(
      'c7300000-0000-4000-8000-000000000001'
    )
  $,
  '22023',
  null,
  'non-owner DM cannot send another DM draft even with known UUID'
);

-- Owner sends once; resend is rejected.
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select lives_ok(
  $$
    select public.dm_send_notification(
      (
        select id
        from public.thong_bao
        where tieu_de = 'P79 owned draft'
      )
    )
  $$,
  'owner DM can send draft once'
);

select throws_ok(
  $$
    select public.dm_send_notification(
      (
        select id
        from public.thong_bao
        where tieu_de = 'P79 owned draft'
      )
    )
  $$,
  '22023',
  null,
  'sent notification cannot be sent again'
);

-- Recipient that leaves subtree before send invalidates the draft send.
select lives_ok(
  $$
    select public.dm_create_notification(
      'P79 stale recipient',
      'Move recipient before send',
      'TIN_TỨC',
      array['c7000000-0000-4000-8000-000000000002'::uuid]
    )
  $$,
  'DM can create second draft before hierarchy change'
);

reset role;
update public.tai_khoan
set manager_id = null
where id = 'c7000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select throws_ok(
  $$
    select public.dm_send_notification(
      (
        select id
        from public.thong_bao
        where tieu_de = 'P79 stale recipient'
      )
    )
  $$,
  '42501',
  null,
  'send rejects recipient that left DM subtree after draft creation'
);

-- Pending DM is blocked from SECURITY DEFINER mutation.
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000005',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select throws_ok(
  $$
    select public.dm_create_notification(
      'Pending blocked',
      'No application access',
      'TIN_TỨC',
      array['c7000000-0000-4000-8000-000000000003'::uuid]
    )
  $$,
  '42501',
  null,
  'pending DM cannot invoke notification definer mutation'
);

-- Locked DM is blocked from reporting definer RPC.
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000006', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000006',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
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
  null,
  'locked account cannot invoke reporting definer RPC'
);

-- OTP-only session is blocked from definer helpers/mutations.
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000007', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c7000000-0000-4000-8000-000000000007',
    'amr', jsonb_build_array(jsonb_build_object('method', 'otp', 'timestamp', 0))
  )::text,
  true
);

select is(
  public.can_creator_read_notification_recipient(
    '00000000-0000-0000-0000-000000000000'
  ),
  false,
  'OTP-only session cannot use notification definer helper as access oracle'
);

select throws_ok(
  $$
    select public.dm_create_notification(
      'OTP blocked',
      'No password AMR',
      'TIN_TỨC',
      array['c7000000-0000-4000-8000-000000000003'::uuid]
    )
  $$,
  '42501',
  null,
  'OTP-only DM cannot invoke notification definer mutation'
);

reset role;
select * from finish();
rollback;
