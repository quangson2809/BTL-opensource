begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

select ok(
  not has_function_privilege('anon', 'public.current_account_has_application_access()', 'EXECUTE'),
  'anon cannot execute application-access helper'
);

select ok(
  not has_function_privilege('anon', 'public.admin_approve_account(uuid)', 'EXECUTE'),
  'anon cannot execute admin RPC'
);

select ok(
  not has_function_privilege('anon', 'public.dm_create_notification(text,text,text,uuid[])', 'EXECUTE'),
  'anon cannot execute DM notification RPC'
);

select ok(
  not has_function_privilege('anon', 'public.personnel_summary(uuid)', 'EXECUTE'),
  'anon cannot execute personnel summary RPC'
);

select ok(
  not has_function_privilege('anon', 'public.report_scope(timestamptz,timestamptz)', 'EXECUTE'),
  'anon cannot execute reporting RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.report_scope(timestamptz,timestamptz)', 'EXECUTE'),
  'authenticated keeps intended reporting RPC access'
);

select ok(
  has_function_privilege('authenticated', 'public.admin_approve_account(uuid)', 'EXECUTE'),
  'authenticated keeps narrow admin RPC entrypoint before role check'
);

select ok(
  not has_function_privilege('authenticated', 'public.provision_self_registered_sa()', 'EXECUTE'),
  'self-registration trigger function is not directly callable'
);

select ok(
  not has_function_privilege('authenticated', 'public.protect_khach_hang_created_at()', 'EXECUTE'),
  'customer timestamp trigger function is not directly callable'
);

select * from finish();
rollback;
