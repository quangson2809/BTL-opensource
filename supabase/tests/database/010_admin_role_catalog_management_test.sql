begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

select throws_ok(
  $ update public.vai_tro set ma_vai_tro = 'ADMIN_RENAMED' where ma_vai_tro = 'ADMIN' $,
  '42501',
  null,
  'system role code cannot be renamed, even by a direct database mutation'
);
select throws_ok(
  $ delete from public.vai_tro where ma_vai_tro = 'ADMIN' $,
  '42501',
  null,
  'system role cannot be deleted, even by a direct database mutation'
);

select ok(
  not has_function_privilege('anon', 'public.admin_create_role(text,text,text,uuid[])', 'EXECUTE'),
  'anon cannot execute role-create RPC'
);
select ok(
  not has_function_privilege('anon', 'public.admin_update_role(uuid,text,text,uuid[])', 'EXECUTE'),
  'anon cannot execute role-update RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_create_role(text,text,text,uuid[])', 'EXECUTE'),
  'authenticated can call the guarded role-create RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_update_role(uuid,text,text,uuid[])', 'EXECUTE'),
  'authenticated can call the guarded role-update RPC'
);
select ok(
  not has_table_privilege('authenticated', 'public.vai_tro', 'INSERT'),
  'authenticated cannot bypass role validation with direct inserts'
);
select ok(
  not has_table_privilege('authenticated', 'public.vai_tro', 'UPDATE'),
  'authenticated cannot bypass role validation with direct updates'
);
select ok(
  not has_table_privilege('authenticated', 'public.phan_quyen_vai_tro', 'DELETE'),
  'authenticated cannot bypass atomic permission replacement'
);
select ok(
  not has_table_privilege('authenticated', 'public.quyen', 'UPDATE'),
  'permission definitions remain migration-owned'
);

insert into auth.users (id, email)
values
  ('c6000000-0000-4000-8000-000000000001', 'role-admin@example.test'),
  ('c6000000-0000-4000-8000-000000000002', 'role-sa@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('c6000000-0000-4000-8000-000000000001', 'Role Admin', 'role-admin@example.test', '0986000001', 'ROLE-ADMIN', null, 'DANG_HOAT_DONG'),
  ('c6000000-0000-4000-8000-000000000002', 'Role SA', 'role-sa@example.test', '0986000002', 'ROLE-SA', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c6000000-0000-4000-8000-000000000001', id
from public.vai_tro
where ma_vai_tro = 'ADMIN';

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c6000000-0000-4000-8000-000000000002', id
from public.vai_tro
where ma_vai_tro = 'SA';

set local role authenticated;
select set_config(
  'test.admin_role_name_before',
  (select ten_vai_tro from public.vai_tro where ma_vai_tro = 'ADMIN'),
  true
);
select set_config(
  'test.admin_role_permission_count_before',
  (
    select count(*)::text
    from public.phan_quyen_vai_tro pq
    join public.vai_tro vt on vt.id = pq.vai_tro_id
    where vt.ma_vai_tro = 'ADMIN'
  ),
  true
);
select throws_ok(
  $
    select public.admin_update_role(
      (select id from public.vai_tro where ma_vai_tro = 'ADMIN'),
      'Modified system role',
      'Must remain protected',
      array[]::uuid[]
    )
  $,
  '42501',
  null,
  'Admin cannot edit system-role metadata or permission assignments'
);
select is(
  (select ten_vai_tro from public.vai_tro where ma_vai_tro = 'ADMIN'),
  current_setting('test.admin_role_name_before'),
  'rejected system-role update leaves its display name unchanged'
);
select is(
  (
    select count(*)::text
    from public.phan_quyen_vai_tro pq
    join public.vai_tro vt on vt.id = pq.vai_tro_id
    where vt.ma_vai_tro = 'ADMIN'
  ),
  current_setting('test.admin_role_permission_count_before'),
  'rejected system-role update leaves its permission mappings unchanged'
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c6000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c6000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select throws_ok(
  $$ select public.admin_create_role('invalid-code', 'Invalid code', null, array[]::uuid[]) $$,
  '22023',
  null,
  'role code must use the canonical uppercase identifier format'
);
select throws_ok(
  $$ select public.admin_create_role('ADMIN', 'Duplicate system role', null, array[]::uuid[]) $$,
  '22023',
  null,
  'reserved system role codes cannot be recreated'
);
select throws_ok(
  $$ select public.admin_create_role('BROKEN_PERMISSION_TEST', 'Broken permission', null, array['ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid]) $$,
  '22023',
  null,
  'role creation rejects permission IDs outside the catalog'
);
select is(
  (select count(*)::bigint from public.vai_tro where ma_vai_tro = 'BROKEN_PERMISSION_TEST'),
  0::bigint,
  'failed permission validation does not leave a partial role'
);

select lives_ok(
  $$
    select public.admin_create_role(
      'REPORT_REVIEWER_TEST',
      'Người duyệt báo cáo thử nghiệm',
      'Vai trò kiểm thử tạo/sửa và cấu hình permission.',
      array['20000000-0000-0000-0000-000000000001'::uuid]
    )
  $$,
  'Admin can create a custom role with an existing permission'
);

select is(
  (select ten_vai_tro from public.vai_tro where ma_vai_tro = 'REPORT_REVIEWER_TEST'),
  'Người duyệt báo cáo thử nghiệm'::text,
  'created role metadata is persisted'
);
select is(
  (
    select count(*)::bigint
    from public.phan_quyen_vai_tro pq
    join public.vai_tro vt on vt.id = pq.vai_tro_id
    where vt.ma_vai_tro = 'REPORT_REVIEWER_TEST'
      and pq.quyen_id = '20000000-0000-0000-0000-000000000001'::uuid
  ),
  1::bigint,
  'selected permissions are mapped to the new role'
);

select throws_ok(
  $$ select public.admin_update_role((select id from public.vai_tro where ma_vai_tro = 'REPORT_REVIEWER_TEST'), '   ', null, array[]::uuid[]) $$,
  '22023',
  null,
  'role update rejects an empty display name'
);

select lives_ok(
  $$
    select public.admin_update_role(
      (select id from public.vai_tro where ma_vai_tro = 'REPORT_REVIEWER_TEST'),
      'Người duyệt báo cáo cập nhật',
      null,
      array[]::uuid[]
    )
  $$,
  'Admin can update role metadata and clear its permission mappings atomically'
);
select results_eq(
  $$
    select ma_vai_tro, ten_vai_tro, mo_ta
    from public.vai_tro
    where ma_vai_tro = 'REPORT_REVIEWER_TEST'
  $$,
  $$
    values ('REPORT_REVIEWER_TEST'::text, 'Người duyệt báo cáo cập nhật'::text, null::text)
  $$,
  'role code remains immutable while editable metadata is updated'
);
select is(
  (
    select count(*)::bigint
    from public.phan_quyen_vai_tro pq
    join public.vai_tro vt on vt.id = pq.vai_tro_id
    where vt.ma_vai_tro = 'REPORT_REVIEWER_TEST'
  ),
  0::bigint,
  'permission mappings are replaced when the selection is empty'
);

select set_config('request.jwt.claim.sub', 'c6000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c6000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select throws_ok(
  $$ select public.admin_create_role('UNAUTHORIZED_ROLE_TEST', 'Unauthorized role', null, array[]::uuid[]) $$,
  '42501',
  null,
  'non-Admin cannot create roles through direct RPC calls'
);
select throws_ok(
  $$ select public.admin_update_role((select id from public.vai_tro where ma_vai_tro = 'REPORT_REVIEWER_TEST'), 'Unauthorized edit', null, array[]::uuid[]) $$,
  '42501',
  null,
  'non-Admin cannot update roles or permission mappings'
);

reset role;
select * from finish();
rollback;
