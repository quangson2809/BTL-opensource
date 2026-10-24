begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, email)
values
  ('94000000-0000-4000-8000-000000000001', 'profile-owner-p15@example.test'),
  ('94000000-0000-4000-8000-000000000002', 'profile-other-p15@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('94000000-0000-4000-8000-000000000001', 'Tên trước cập nhật', 'profile-owner-p15@example.test', '0940000001', 'PROFILE-015-001', null, 'DANG_HOAT_DONG'),
  ('94000000-0000-4000-8000-000000000002', 'Tài khoản khác', 'profile-other-p15@example.test', '0940000002', 'PROFILE-015-002', null, 'DANG_HOAT_DONG');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', '94000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select ok(
  has_column_privilege('authenticated', 'public.tai_khoan', 'ho_ten', 'UPDATE'),
  'authenticated can update the display-name column'
);
select ok(
  not has_column_privilege('authenticated', 'public.tai_khoan', 'id', 'UPDATE'),
  'authenticated cannot update account ID'
);
select ok(
  not has_column_privilege('authenticated', 'public.tai_khoan', 'email', 'UPDATE'),
  'authenticated cannot directly update the Auth-linked email'
);
select ok(
  has_column_privilege('authenticated', 'public.tai_khoan', 'so_dien_thoai', 'UPDATE'),
  'authenticated can update the phone column'
);
select ok(
  not has_column_privilege('authenticated', 'public.tai_khoan', 'ma_dai_ly', 'UPDATE'),
  'authenticated cannot update official agency code'
);
select ok(
  not has_column_privilege('authenticated', 'public.tai_khoan', 'manager_id', 'UPDATE'),
  'authenticated cannot update manager relationship'
);
select ok(
  not has_column_privilege('authenticated', 'public.tai_khoan', 'trang_thai', 'UPDATE'),
  'authenticated cannot change account approval or lock status'
);

select is(
  (select ho_ten from public.tai_khoan where id = '94000000-0000-4000-8000-000000000001'),
  'Tên trước cập nhật'::text,
  'signed-in user can read own profile'
);

update public.tai_khoan
set ho_ten = 'Tên đã cập nhật'
where id = '94000000-0000-4000-8000-000000000001';

select is(
  (select ho_ten from public.tai_khoan where id = '94000000-0000-4000-8000-000000000001'),
  'Tên đã cập nhật'::text,
  'signed-in user can update own display name'
);

update public.tai_khoan
set so_dien_thoai = '0940000099'
where id = '94000000-0000-4000-8000-000000000001';

select is(
  (select so_dien_thoai from public.tai_khoan where id = '94000000-0000-4000-8000-000000000001'),
  '0940000099'::text,
  'signed-in user can update own phone number'
);

select results_eq(
  $$
    update public.tai_khoan
    set ho_ten = 'Không được phép sửa người khác'
    where id = '94000000-0000-4000-8000-000000000002'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'signed-in user cannot update another account profile'
);

select throws_ok(
  $$
    update public.tai_khoan
    set trang_thai = 'KHOA'
    where id = '94000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'profile update cannot change account state'
);

select throws_ok(
  $$
    update public.tai_khoan
    set manager_id = '94000000-0000-4000-8000-000000000002'
    where id = '94000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'profile update cannot change manager relationship'
);

select throws_ok(
  $$
    update public.tai_khoan
    set id = '94000000-0000-4000-8000-000000000002'
    where id = '94000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'profile update cannot change account ID'
);

select * from finish();
rollback;
