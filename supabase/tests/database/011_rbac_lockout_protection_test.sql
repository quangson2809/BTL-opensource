begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

select ok(
  not has_table_privilege('authenticated', 'public.phan_cong_vai_tro', 'INSERT'),
  'authenticated cannot bypass guarded role assignment RPCs with direct inserts'
);
select ok(
  not has_table_privilege('authenticated', 'public.phan_cong_vai_tro', 'DELETE'),
  'authenticated cannot bypass guarded role revocation RPCs with direct deletes'
);

insert into auth.users (id, email)
values
  ('c7000000-0000-4000-8000-000000000001', 'lockout-admin@example.test'),
  ('c7000000-0000-4000-8000-000000000002', 'lockout-sa@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('c7000000-0000-4000-8000-000000000001', 'Lockout Admin', 'lockout-admin@example.test', '0987000001', 'LOCK-ADMIN', null, 'DANG_HOAT_DONG'),
  ('c7000000-0000-4000-8000-000000000002', 'Lockout SA', 'lockout-sa@example.test', '0987000002', 'LOCK-SA', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c7000000-0000-4000-8000-000000000001', id
from public.vai_tro
where ma_vai_tro = 'ADMIN';

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c7000000-0000-4000-8000-000000000002', id
from public.vai_tro
where ma_vai_tro = 'SA';

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
  $$ select public.admin_lock_account('c7000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'Admin cannot lock their own account'
);
select is(
  (select trang_thai from public.tai_khoan where id = 'c7000000-0000-4000-8000-000000000001'),
  'DANG_HOAT_DONG'::text,
  'rejected self-lock leaves the Admin account active'
);

select throws_ok(
  $$ select public.admin_revoke_role(
    'c7000000-0000-4000-8000-000000000001',
    (select id from public.vai_tro where ma_vai_tro = 'ADMIN')
  ) $$,
  '42501',
  null,
  'Admin cannot revoke their own ADMIN role'
);
select is(
  (
    select count(*)::bigint
    from public.phan_cong_vai_tro pc
    join public.vai_tro vt on vt.id = pc.vai_tro_id
    where pc.tai_khoan_id = 'c7000000-0000-4000-8000-000000000001'
      and vt.ma_vai_tro = 'ADMIN'
  ),
  1::bigint,
  'rejected self-revoke keeps the Admin role assignment'
);

select lives_ok(
  $$ select public.admin_lock_account('c7000000-0000-4000-8000-000000000002') $$,
  'Admin can still lock another account'
);
select is(
  (select trang_thai from public.tai_khoan where id = 'c7000000-0000-4000-8000-000000000002'),
  'KHOA'::text,
  'a valid lock operation still changes the target account state'
);

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

select throws_ok(
  $$ select public.admin_lock_account('c7000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'non-Admin cannot lock accounts through the direct RPC'
);
select throws_ok(
  $$ select public.admin_revoke_role(
    'c7000000-0000-4000-8000-000000000001',
    (select id from public.vai_tro where ma_vai_tro = 'ADMIN')
  ) $$,
  '42501',
  null,
  'non-Admin cannot revoke roles through the direct RPC'
);

reset role;
select * from finish();
rollback;
