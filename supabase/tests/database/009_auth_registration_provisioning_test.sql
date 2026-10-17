begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

select is(
  (select count(*)::bigint from public.vai_tro where ma_vai_tro = 'SA'),
  1::bigint,
  'SA role exists before provisioning failure test'
);

-- This test is isolated in a transaction. Removing SA cascades only inside the
-- test transaction, and rollback restores the catalog and all role assignments.
delete from public.vai_tro where ma_vai_tro = 'SA';

select is(
  (select count(*)::bigint from public.vai_tro where ma_vai_tro = 'SA'),
  0::bigint,
  'SA role is absent during this provisioning test'
);

select throws_ok(
  $$
    insert into auth.users (id, email, raw_user_meta_data)
    values (
      'f9000000-0000-4000-8000-000000000009',
      'phase2-missing-sa-role@example.test',
      jsonb_build_object(
        'registration_type', 'SA_SELF_REGISTRATION',
        'ho_ten', 'Missing SA role fixture',
        'so_dien_thoai', '0999000009',
        'ma_dai_ly', 'MISSING-SA-ROLE'
      )
    )
  $$,
  '55000',
  'SA role seed is missing',
  'SA self-registration fails explicitly when the SA role is missing'
);

select is(
  (select count(*)::bigint
   from auth.users
   where id = 'f9000000-0000-4000-8000-000000000009'),
  0::bigint,
  'failed provisioning leaves no partial Auth user'
);

select * from finish();
rollback;
