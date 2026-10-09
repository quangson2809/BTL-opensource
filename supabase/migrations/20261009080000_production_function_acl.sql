-- Production hardening: Supabase Platform grants function EXECUTE directly to
-- API roles when functions are created. REVOKE FROM PUBLIC alone therefore does
-- not remove an explicit anon grant. Keep user-facing RPCs authenticated-only
-- and make trigger-only helpers non-callable through the Data API.

revoke execute on function public.current_account_has_application_access() from anon;
revoke execute on function public.has_role(text) from anon;
revoke execute on function public.has_permission(text) from anon;
revoke execute on function public.is_in_subtree(uuid) from anon;

revoke execute on function public.admin_approve_account(uuid) from anon;
revoke execute on function public.admin_lock_account(uuid) from anon;
revoke execute on function public.admin_unlock_account(uuid) from anon;
revoke execute on function public.admin_assign_role(uuid, uuid) from anon;
revoke execute on function public.admin_revoke_role(uuid, uuid) from anon;

revoke execute on function public.personnel_summary(uuid) from anon;
revoke execute on function public.can_creator_read_notification_recipient(uuid) from anon;
revoke execute on function public.can_recipient_read_sent_notification(uuid, uuid) from anon;
revoke execute on function public.dm_create_notification(text, text, text, uuid[]) from anon;
revoke execute on function public.dm_send_notification(uuid) from anon;
revoke execute on function public.report_scope(timestamptz, timestamptz) from anon;

-- Trigger-only functions must not be exposed as RPCs at all. Trigger execution
-- is unaffected by revoking caller EXECUTE after trigger creation.
revoke all on function public.provision_self_registered_sa()
  from public, anon, authenticated, service_role;

revoke all on function public.protect_khach_hang_created_at()
  from public, anon, authenticated, service_role;
