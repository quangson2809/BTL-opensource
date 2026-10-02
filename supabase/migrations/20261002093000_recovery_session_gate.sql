-- Phase 2 password recovery hardening.
-- The source-derived application sign-in method is email/password. Email OTP
-- sessions (including recovery verification) may update Auth credentials, but
-- they must not become a shortcut into protected business data.

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
  and exists (
    select 1
    from jsonb_array_elements(
      coalesce(auth.jwt() -> 'amr', '[]'::jsonb)
    ) as method
    where method ->> 'method' = 'password'
  );
$$;
