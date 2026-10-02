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
  not has_function_privilege(
    'authenticated',
    'public.hook_password_verification_attempt(jsonb)',
    'EXECUTE'
  ),
  'authenticated users cannot invoke the password verification hook'
);

select ok(
  has_function_privilege(
    'supabase_auth_admin',
    'public.hook_password_verification_attempt(jsonb)',
    'EXECUTE'
  ),
  'Supabase Auth can invoke the password verification hook'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and policyname like '%_application_access_gate'
      and permissive = 'RESTRICTIVE'
  ),
  9::bigint,
  'all nine business tables have a restrictive Phase 2 access gate'
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

-- Add one known permission to SA only inside this rolled-back test so every
-- exposed authorization helper has a positive active baseline and deny cases.
insert into public.phan_quyen_vai_tro (
  vai_tro_id,
  quyen_id,
  nguoi_gan_id
)
values (
  '10000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000001',
  null
)
on conflict (vai_tro_id, quyen_id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::bigint from public.vai_tro),
  0::bigint,
  'pending account cannot read protected business data'
);

select is(public.has_role('SA'), false, 'pending account cannot query role helper');
select is(
  public.has_permission('ACTIVITY_VIEW_SUBTREE'),
  false,
  'pending account cannot query permission helper'
);
select is(
  public.is_in_subtree('90000000-0000-4000-8000-000000000002'),
  false,
  'pending account cannot query hierarchy helper'
);
select is(
  public.can_view_activity('90000000-0000-4000-8000-000000000002'),
  false,
  'pending account cannot query activity authorization helper'
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
select is(public.has_role('SA'), true, 'active account can query own role');
select is(
  public.has_permission('ACTIVITY_VIEW_SUBTREE'),
  true,
  'active account can query granted permission'
);
select is(
  public.is_in_subtree('90000000-0000-4000-8000-000000000002'),
  true,
  'active account hierarchy helper allows self'
);
select is(
  public.can_view_activity('90000000-0000-4000-8000-000000000002'),
  true,
  'active account activity helper allows self'
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
select is(public.has_role('SA'), false, 'administratively locked account cannot query role helper');
select is(
  public.is_in_subtree('90000000-0000-4000-8000-000000000002'),
  false,
  'administratively locked account cannot query hierarchy helper'
);
select is(
  public.can_view_activity('90000000-0000-4000-8000-000000000002'),
  false,
  'administratively locked account cannot query activity helper'
);

reset role;

update public.tai_khoan
set
  trang_thai = 'DANG_HOAT_DONG',
  dang_nhap_sai_lien_tiep = 0,
  khoa_tam_den = null
where id = '90000000-0000-4000-8000-000000000002';

select is(
  public.hook_password_verification_attempt(
    jsonb_build_object(
      'user_id', '90000000-0000-4000-8000-000000000002',
      'valid', false
    )
  ) ->> 'decision',
  'continue',
  'first invalid password remains provider-rejected while hook records it'
);

select is(
  (
    select dang_nhap_sai_lien_tiep
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  1,
  'first invalid password increments the counter'
);

select public.hook_password_verification_attempt(
  jsonb_build_object('user_id', '90000000-0000-4000-8000-000000000002', 'valid', false)
);
select public.hook_password_verification_attempt(
  jsonb_build_object('user_id', '90000000-0000-4000-8000-000000000002', 'valid', false)
);
select public.hook_password_verification_attempt(
  jsonb_build_object('user_id', '90000000-0000-4000-8000-000000000002', 'valid', false)
);
select public.hook_password_verification_attempt(
  jsonb_build_object('user_id', '90000000-0000-4000-8000-000000000002', 'valid', false)
);
select public.hook_password_verification_attempt(
  jsonb_build_object('user_id', '90000000-0000-4000-8000-000000000002', 'valid', false)
);

select is(
  (
    select dang_nhap_sai_lien_tiep
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  6,
  'six invalid password verifications produce six consecutive failures'
);

select ok(
  (
    select khoa_tam_den between now() + interval '29 minutes' and now() + interval '31 minutes'
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  'sixth invalid password creates an approximately 30-minute lock'
);

select is(
  public.hook_password_verification_attempt(
    jsonb_build_object(
      'user_id', '90000000-0000-4000-8000-000000000002',
      'valid', true
    )
  ) ->> 'decision',
  'reject',
  'correct password is rejected while temporary lock is active'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::bigint from public.vai_tro),
  0::bigint,
  'temporarily locked account cannot use protected business data'
);
select is(public.has_role('SA'), false, 'temporarily locked account cannot query role helper');
select is(
  public.is_in_subtree('90000000-0000-4000-8000-000000000002'),
  false,
  'temporarily locked account cannot query hierarchy helper'
);

reset role;

update public.tai_khoan
set khoa_tam_den = now() - interval '1 minute'
where id = '90000000-0000-4000-8000-000000000002';

select is(
  public.hook_password_verification_attempt(
    jsonb_build_object(
      'user_id', '90000000-0000-4000-8000-000000000002',
      'valid', true
    )
  ) ->> 'decision',
  'continue',
  'valid password after lock expiry is allowed'
);

select is(
  (
    select dang_nhap_sai_lien_tiep
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  0,
  'valid password after lock expiry resets consecutive failures'
);

select is(
  (
    select khoa_tam_den is null
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  true,
  'valid password after lock expiry clears temporary lock'
);

select public.hook_password_verification_attempt(
  jsonb_build_object('user_id', '90000000-0000-4000-8000-000000000002', 'valid', false)
);

select is(
  (
    select dang_nhap_sai_lien_tiep
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  1,
  'next invalid password starts a new consecutive-failure cycle'
);

select public.hook_password_verification_attempt(
  jsonb_build_object('user_id', '90000000-0000-4000-8000-000000000002', 'valid', true)
);

select is(
  (
    select dang_nhap_sai_lien_tiep
    from public.tai_khoan
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  0,
  'successful verification resets a later failure cycle'
);

select * from finish();
rollback;
