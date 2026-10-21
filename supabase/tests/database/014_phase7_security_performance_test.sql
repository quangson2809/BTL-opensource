begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

select ok(
  has_schema_privilege('authenticated', 'app_private', 'USAGE'),
  'authenticated can use policy-internal helpers required by RLS'
);
select ok(
  has_function_privilege('authenticated', 'app_private.has_role(text)', 'EXECUTE'),
  'RLS can invoke the non-exposed role helper'
);
select ok(
  has_function_privilege('authenticated', 'public.has_role(text)', 'EXECUTE'),
  'authenticated can query only its own guarded role assignments through the role helper'
);
select ok(
  has_function_privilege('authenticated', 'public.has_permission(text)', 'EXECUTE'),
  'authenticated can query only its own guarded permissions through the permission helper'
);
select ok(
  not has_function_privilege('authenticated', 'public.is_in_subtree(uuid)', 'EXECUTE'),
  'authenticated cannot query arbitrary account hierarchy membership through the public API'
);

select ok(
  has_function_privilege('authenticated', 'public.can_view_activity(uuid)', 'EXECUTE'),
  'authenticated can query the guarded activity visibility helper'
);
select ok(
  has_function_privilege('authenticated', 'public.current_account_has_application_access()', 'EXECUTE'),
  'authenticated can query active access for its own session only'
);
select ok(
  not has_function_privilege('authenticated', 'public.can_creator_read_notification_recipient(uuid)', 'EXECUTE'),
  'notification recipient visibility helper is policy-internal'
);
select ok(
  not has_function_privilege('authenticated', 'public.can_recipient_read_sent_notification(uuid,uuid)', 'EXECUTE'),
  'sent-notification visibility helper is policy-internal'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_phan_cong_vai_tro_nguoi_gan_id'
  ),
  'role assignment audit foreign key has a supporting index'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_phan_quyen_vai_tro_nguoi_gan_id'
  ),
  'role-permission audit foreign key has a supporting index'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'khach_hang'
      and policyname = 'khach_hang_select_owner'
      and qual like '%SELECT auth.uid()%'
  ),
  'customer owner policy evaluates auth.uid through a scalar subquery'
);

select * from finish();
rollback;
