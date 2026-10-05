begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, email)
values
  ('a3000000-0000-4000-8000-000000000001', 'phase3-admin@example.test'),
  ('a3000000-0000-4000-8000-000000000002', 'phase3-pending@example.test'),
  ('a3000000-0000-4000-8000-000000000003', 'phase3-sa@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('a3000000-0000-4000-8000-000000000001', 'Phase 3 Admin', 'phase3-admin@example.test', '0930000001', 'P3-ADMIN', null, 'DANG_HOAT_DONG'),
  ('a3000000-0000-4000-8000-000000000002', 'Phase 3 Pending', 'phase3-pending@example.test', '0930000002', 'P3-PENDING', null, 'CHO_PHE_DUYET'),
  ('a3000000-0000-4000-8000-000000000003', 'Phase 3 SA', 'phase3-sa@example.test', '0930000003', 'P3-SA', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'a3000000-0000-4000-8000-000000000001', id
from public.vai_tro
where ma_vai_tro = 'ADMIN';

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'a3000000-0000-4000-8000-000000000002', id
from public.vai_tro
where ma_vai_tro = 'SA';

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'a3000000-0000-4000-8000-000000000003', id
from public.vai_tro
where ma_vai_tro = 'SA';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Active Admin with password AMR.
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'a3000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(
  (select count(*)::bigint from public.tai_khoan),
  3::bigint,
  'Admin can read the account list'
);

select lives_ok(
  $$ select public.admin_approve_account('a3000000-0000-4000-8000-000000000002') $$,
  'Admin can approve a pending account'
);

select is(
  (
    select trang_thai
    from public.tai_khoan
    where id = 'a3000000-0000-4000-8000-000000000002'
  ),
  'DANG_HOAT_DONG'::text,
  'approval changes only CHO_PHE_DUYET to DANG_HOAT_DONG'
);

-- The same JWT claims become usable immediately after approval.
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'a3000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(public.has_role('SA'), true, 'approved SA has normal role access');

select is(
  (select count(*)::bigint from public.tai_khoan),
  1::bigint,
  'non-Admin account read remains limited to existing RLS scope'
);

-- Admin locks the active SA.
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'a3000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select lives_ok(
  $$ select public.admin_lock_account('a3000000-0000-4000-8000-000000000002') $$,
  'Admin can lock an active account'
);

-- Existing SA JWT loses application access immediately.
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'a3000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(
  (select count(*)::bigint from public.vai_tro),
  0::bigint,
  'locked account existing JWT cannot read protected business data'
);
select is(public.has_role('SA'), false, 'locked account role helper is disabled');

-- Admin unlocks the account.
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'a3000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select lives_ok(
  $$ select public.admin_unlock_account('a3000000-0000-4000-8000-000000000002') $$,
  'Admin can unlock a locked account'
);

select lives_ok(
  $$
    select public.admin_assign_role(
      'a3000000-0000-4000-8000-000000000002',
      '10000000-0000-0000-0000-000000000003'
    )
  $$,
  'Admin can assign an existing role'
);

select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'a3000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(public.has_role('UM'), true, 'role helper reflects Admin assignment');

select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'a3000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select lives_ok(
  $$
    select public.admin_revoke_role(
      'a3000000-0000-4000-8000-000000000002',
      '10000000-0000-0000-0000-000000000003'
    )
  $$,
  'Admin can revoke an assigned role'
);

select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'a3000000-0000-4000-8000-000000000002',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select is(public.has_role('UM'), false, 'role helper reflects Admin revoke');

select throws_ok(
  $$
    select public.admin_assign_role(
      'a3000000-0000-4000-8000-000000000002',
      '10000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'non-Admin cannot call Admin role assignment RPC'
);

select throws_ok(
  $$
    select public.admin_revoke_role(
      'a3000000-0000-4000-8000-000000000002',
      '10000000-0000-0000-0000-000000000004'
    )
  $$,
  '42501',
  null,
  'non-Admin cannot call Admin role revoke RPC'
);

select throws_ok(
  $$
    insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
    values (
      'a3000000-0000-4000-8000-000000000002',
      '10000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'direct role assignment bypass is blocked by RLS'
);

select throws_ok(
  $$
    update public.tai_khoan
    set trang_thai = 'KHOA'
    where id = 'a3000000-0000-4000-8000-000000000003'
  $$,
  '42501',
  null,
  'direct account lifecycle mutation bypass is blocked'
);

select hasnt_table(
  'public',
  'phan_quyen_tai_khoan',
  'Phase 3 does not add direct permission-to-account assignments'
);
select hasnt_column(
  'public',
  'tai_khoan',
  'quyen_id',
  'Phase 3 does not add a direct permission column to accounts'
);

select * from finish();
rollback;
