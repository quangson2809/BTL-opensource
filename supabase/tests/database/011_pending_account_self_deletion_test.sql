begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

select ok(
  not has_function_privilege('anon', 'public.delete_own_pending_account()', 'EXECUTE'),
  'anon cannot invoke pending-account self-deletion'
);
select ok(
  has_function_privilege('authenticated', 'public.delete_own_pending_account()', 'EXECUTE'),
  'authenticated users can invoke the guarded self-deletion RPC'
);

insert into auth.users (id, email)
values
  ('c7000000-0000-4000-8000-000000000001', 'pending-delete@example.test'),
  ('c7000000-0000-4000-8000-000000000002', 'active-delete@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('c7000000-0000-4000-8000-000000000001', 'Pending Delete', 'pending-delete@example.test', '0987000001', 'PENDING-DELETE', null, 'CHO_PHE_DUYET'),
  ('c7000000-0000-4000-8000-000000000002', 'Active Delete', 'active-delete@example.test', '0987000002', 'ACTIVE-DELETE', null, 'DANG_HOAT_DONG');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('role', 'authenticated', 'sub', 'c7000000-0000-4000-8000-000000000001')::text,
  true
);

select lives_ok(
  $$ select public.delete_own_pending_account() $$,
  'a user can delete their own pending account'
);
select is(
  (select count(*)::bigint from public.tai_khoan where id = 'c7000000-0000-4000-8000-000000000001'),
  0::bigint,
  'self-deletion removes the pending profile'
);
select is(
  (select count(*)::bigint from auth.users where id = 'c7000000-0000-4000-8000-000000000001'),
  0::bigint,
  'self-deletion removes the associated Auth identity'
);

select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('role', 'authenticated', 'sub', 'c7000000-0000-4000-8000-000000000002')::text,
  true
);
select throws_ok(
  $$ select public.delete_own_pending_account() $$,
  '42501',
  'Only pending accounts may self-delete',
  'active accounts cannot use pending-account self-deletion'
);
select is(
  (select count(*)::bigint from public.tai_khoan where id = 'c7000000-0000-4000-8000-000000000002'),
  1::bigint,
  'rejected deletion leaves the active profile intact'
);

select * from finish();
rollback;
