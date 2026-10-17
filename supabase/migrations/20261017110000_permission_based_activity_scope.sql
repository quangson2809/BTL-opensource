-- Make the existing ACTIVITY_VIEW_SUBTREE permission authoritative rather than
-- coupling it to hard-coded DM/UM role codes. The migration-owned defaults still
-- grant this capability only to DM and UM; Admin may now intentionally map it to
-- another role through the role catalog workflow.

create or replace function public.can_view_activity(activity_owner_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select public.current_account_has_application_access()
    and (
      activity_owner_id = auth.uid()
      or (
        public.has_permission('ACTIVITY_VIEW_SUBTREE')
        and public.is_in_subtree(activity_owner_id)
      )
    );
$$;
