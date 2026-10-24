-- Permit self-service phone updates while keeping all authorization and identity
-- fields protected. The existing tai_khoan_so_dien_thoai_key unique constraint
-- remains the final guard against assigning a phone to multiple accounts.

revoke update on table public.tai_khoan from anon, authenticated;
revoke update (
  id,
  ho_ten,
  email,
  so_dien_thoai,
  ma_dai_ly,
  manager_id,
  trang_thai,
  created_at,
  updated_at,
  dang_nhap_sai_lien_tiep,
  khoa_tam_den
) on table public.tai_khoan from anon, authenticated;

grant update (ho_ten, so_dien_thoai) on table public.tai_khoan to authenticated;

drop policy if exists tai_khoan_update_own_profile on public.tai_khoan;
create policy tai_khoan_update_own_profile
on public.tai_khoan
as permissive
for update
to authenticated
using (
  id = (select auth.uid())
  and (select app_private.current_account_has_application_access())
)
with check (
  id = (select auth.uid())
  and (select app_private.current_account_has_application_access())
);
