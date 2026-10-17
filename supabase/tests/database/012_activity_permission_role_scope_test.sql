begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, email)
values
  ('c8000000-0000-4000-8000-000000000001', 'activity-reader@example.test'),
  ('c8000000-0000-4000-8000-000000000002', 'activity-child@example.test'),
  ('c8000000-0000-4000-8000-000000000003', 'activity-outsider@example.test'),
  ('c8000000-0000-4000-8000-000000000004', 'activity-admin@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('c8000000-0000-4000-8000-000000000001', 'Custom Activity Reader', 'activity-reader@example.test', '0988000001', 'ACT-READER', null, 'DANG_HOAT_DONG'),
  ('c8000000-0000-4000-8000-000000000002', 'Reader Child', 'activity-child@example.test', '0988000002', 'ACT-CHILD', 'c8000000-0000-4000-8000-000000000001', 'DANG_HOAT_DONG'),
  ('c8000000-0000-4000-8000-000000000003', 'Reader Outsider', 'activity-outsider@example.test', '0988000003', 'ACT-OUTSIDER', null, 'DANG_HOAT_DONG'),
  ('c8000000-0000-4000-8000-000000000004', 'Activity Admin', 'activity-admin@example.test', '0988000004', 'ACT-ADMIN', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c8000000-0000-4000-8000-000000000004', id
from public.vai_tro
where ma_vai_tro = 'ADMIN';

insert into public.hoat_dong (
  id, tai_khoan_id, loai_hoat_dong, dia_diem, thoi_gian, so_khach_hang_ket_noi
)
values
  ('c8000000-0000-4000-8000-000000000101', 'c8000000-0000-4000-8000-000000000001', 'GẶP_GỠ', 'Reader own activity', now(), 1),
  ('c8000000-0000-4000-8000-000000000102', 'c8000000-0000-4000-8000-000000000002', 'GẶP_GỠ', 'Reader subtree activity', now(), 2),
  ('c8000000-0000-4000-8000-000000000103', 'c8000000-0000-4000-8000-000000000003', 'GẶP_GỠ', 'Reader out-of-scope activity', now(), 3);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c8000000-0000-4000-8000-000000000004', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c8000000-0000-4000-8000-000000000004',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select lives_ok(
  $$
    select public.admin_create_role(
      'ACTIVITY_READER_TEST',
      'Activity Reader Test',
      'Test-only role proving existing permissions drive RLS.',
      array[]::uuid[]
    )
  $$,
  'Admin can create a custom role with no permission mapping'
);

select lives_ok(
  $$
    select public.admin_assign_role(
      'c8000000-0000-4000-8000-000000000001',
      (select id from public.vai_tro where ma_vai_tro = 'ACTIVITY_READER_TEST')
    )
  $$,
  'Admin can assign the custom role to the scoped reader account'
);

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

select is(
  (select count(*)::bigint from public.hoat_dong where id = 'c8000000-0000-4000-8000-000000000101'),
  1::bigint,
  'custom role can read the caller account own activity'
);
select is(
  (select count(*)::bigint from public.hoat_dong where id = 'c8000000-0000-4000-8000-000000000102'),
  0::bigint,
  'custom role cannot read descendant activity before receiving its permission'
);

select set_config('request.jwt.claim.sub', 'c8000000-0000-4000-8000-000000000004', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c8000000-0000-4000-8000-000000000004',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select lives_ok(
  $$
    select public.admin_update_role(
      (select id from public.vai_tro where ma_vai_tro = 'ACTIVITY_READER_TEST'),
      'Activity Reader Test',
      'Permission mapping enabled for the role-scope test.',
      array['20000000-0000-0000-0000-000000000001'::uuid]
    )
  $$,
  'Admin can grant the existing ACTIVITY_VIEW_SUBTREE permission to the custom role'
);

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

select is(
  (select count(*)::bigint from public.hoat_dong where id = 'c8000000-0000-4000-8000-000000000102'),
  1::bigint,
  'the existing permission now grants activity reads for descendants in the caller subtree'
);
select is(
  (select count(*)::bigint from public.hoat_dong where id = 'c8000000-0000-4000-8000-000000000103'),
  0::bigint,
  'permission mapping does not grant activity reads outside the caller subtree'
);
select is(
  public.has_role('DM') or public.has_role('UM'),
  false,
  'custom-role permission behavior does not depend on hard-coded DM/UM membership'
);

reset role;
select * from finish();
rollback;
