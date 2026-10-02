-- Phase 2 password recovery hardening.
-- A recovery OTP creates an authenticated Supabase session. That session is
-- sufficient to update the password, but it must not become a shortcut into
-- protected business data before the user completes reset and signs in normally.

create or replace function public.current_account_has_application_access()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.tai_khoan tk
    where tk.id = auth.uid()
      and tk.trang_thai = 'DANG_HOAT_DONG'
      and (tk.khoa_tam_den is null or tk.khoa_tam_den <= now())
  )
  and not exists (
    select 1
    from jsonb_array_elements(
      coalesce(auth.jwt() -> 'amr', '[]'::jsonb)
    ) as method
    where method ->> 'method' = 'recovery'
  );
$$;
