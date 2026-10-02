begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

select has_column(
  'public',
  'tai_khoan',
  'dang_nhap_sai_lien_tiep',
  'account stores consecutive failed-login count'
);

select has_column(
  'public',
  'tai_khoan',
  'khoa_tam_den',
  'account stores temporary-lock expiry'
);

select ok(
  not has_function_privilege('authenticated', 'public.record_failed_login(text)', 'EXECUTE'),
  'authenticated users cannot call failed-login bookkeeping directly'
);

select ok(
  has_function_privilege('service_role', 'public.record_failed_login(text)', 'EXECUTE'),
  'service role can call failed-login bookkeeping'
);

insert into auth.users (id, email)
values ('90000000-0000-4000-8000-000000000001', 'unmarked@example.test');

select ok(
  not exists (
    select 1
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000001'
  ),
  'unmarked auth user is not silently provisioned as SA'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '90000000-0000-4000-8000-000000000002',
  'new-sa@example.test',
  jsonb_build_object(
    'registration_type', 'SA_SELF_REGISTRATION',
    'ho_ten', 'SA Mới',
    'so_dien_thoai', '0990000001',
    'ma_dai_ly', 'SA-NEW-001'
  )
);

select is(
  (
    select trang_thai
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  'CHO_PHE_DUYET'::text,
  'self-registered SA starts pending approval'
);

select ok(
  exists (
    select 1
    from public.phan_cong_vai_tro pc
    join public.vai_tro vt on vt.id = pc.vai_tro_id
    where pc.tai_khoan_id = '90000000-0000-4000-8000-000000000002'
      and vt.ma_vai_tro = 'SA'
  ),
  'self-registered account receives SA role'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::bigint from public.vai_tro),
  0::bigint,
  'pending account cannot read protected business data'
);

reset role;

update public.tai_khoan
set trang_thai = 'DANG_HOAT_DONG'
where id = '90000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);

select ok(
  (select count(*) from public.vai_tro) > 0,
  'active account can reach business data allowed by normal RLS'
);

reset role;

update public.tai_khoan
set trang_thai = 'KHOA'
where id = '90000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::bigint from public.vai_tro),
  0::bigint,
  'administratively locked account cannot read protected business data'
);

reset role;

update public.tai_khoan
set
  trang_thai = 'DANG_HOAT_DONG',
  dang_nhap_sai_lien_tiep = 0,
  khoa_tam_den = null
where id = '90000000-0000-4000-8000-000000000002';

select is(
  (select failed_attempts from public.record_failed_login('new-sa@example.test')),
  1,
  'first failed login increments the counter'
);
select is((select failed_attempts from public.record_failed_login('new-sa@example.test')), 2, 'second failed login increments the counter');
select is((select failed_attempts from public.record_failed_login('new-sa@example.test')), 3, 'third failed login increments the counter');
select is((select failed_attempts from public.record_failed_login('new-sa@example.test')), 4, 'fourth failed login increments the counter');
select is((select failed_attempts from public.record_failed_login('new-sa@example.test')), 5, 'fifth failed login increments the counter');
select is((select failed_attempts from public.record_failed_login('new-sa@example.test')), 6, 'sixth failed login increments the counter and locks');

select ok(
  (
    select khoa_tam_den between now() + interval '29 minutes' and now() + interval '31 minutes'
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  'sixth failed login creates an approximately 30-minute lock'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::bigint from public.vai_tro),
  0::bigint,
  'temporarily locked account cannot use protected business data'
);

reset role;

update public.tai_khoan
set khoa_tam_den = now() - interval '1 minute'
where id = '90000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);

select ok(
  (select count(*) from public.vai_tro) > 0,
  'expired temporary lock no longer blocks an active account'
);

reset role;

select is(
  (select failed_attempts from public.record_failed_login('new-sa@example.test')),
  1,
  'first failed login after lock expiry starts a new consecutive-failure cycle'
);

select is(
  (
    select khoa_tam_den is null
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  true,
  'new failure cycle is not immediately relocked'
);

select lives_ok(
  $$ select public.reset_login_failures('90000000-0000-4000-8000-000000000002') $$,
  'successful-login reset function executes'
);

select is(
  (
    select dang_nhap_sai_lien_tiep
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  0,
  'successful-login reset clears consecutive failures'
);

select is(
  (
    select khoa_tam_den is null
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  true,
  'successful-login reset clears temporary lock state'
);

select * from finish();
rollback;
