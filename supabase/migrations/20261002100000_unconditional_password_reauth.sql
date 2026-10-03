-- Phase 2: make email reauthentication OTP unconditional for password changes.
--
-- Supabase Auth/GoTrue currently skips nonce verification for password updates
-- when a session was created less than 24 hours ago. The canonical Phase 2
-- contract requires email reauthentication OTP for every authenticated password
-- change, including a freshly created password session.
--
-- IDAILY is already committed to self-hosted Supabase Auth for Phase 2 security
-- invariants. Keep the provider as the OTP generator/verifier, but mark password
-- sessions as older than GoTrue's built-in "recent login" exemption as soon as
-- GoTrue records the password AMR claim. Recovery/email-OTP sessions are not
-- modified, so password recovery can still update credentials through its own
-- provider flow.
--
-- Deployment constraint: do not enable a time-boxed session lifetime that uses
-- auth.sessions.created_at while this compatibility shim is active. Replace this
-- shim if/when the pinned/self-hosted Auth version exposes a configurable
-- unconditional reauthentication threshold.

create or replace function public.force_password_session_reauthentication()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
begin
  if new.authentication_method = 'password' then
    update auth.sessions
    set created_at = least(created_at, now() - interval '25 hours')
    where id = new.session_id;
  end if;

  return new;
end;
$$;

revoke all on function public.force_password_session_reauthentication()
  from public, anon, authenticated, service_role;

create trigger on_password_amr_force_reauthentication
after insert or update of authentication_method
on auth.mfa_amr_claims
for each row
when (new.authentication_method = 'password')
execute function public.force_password_session_reauthentication();
