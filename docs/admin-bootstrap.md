# Admin bootstrap

Phase 3 does **not** expose public Admin registration. The first production Admin is an operator/bootstrap concern, not an application self-service flow.

## Production bootstrap

Use a privileged Supabase operator session (Dashboard or a one-off server-side script using a secret/service-role credential) and keep all real credentials outside the repository.

1. Create the Auth user through Supabase Admin tooling. Do not use the SA self-registration metadata marker.
2. Record the created Auth user UUID.
3. In one privileged database transaction, create the matching active business account and assign the existing `ADMIN` role:

```sql
begin;

insert into public.tai_khoan (
  id,
  ho_ten,
  email,
  so_dien_thoai,
  ma_dai_ly,
  manager_id,
  trang_thai
)
values (
  '<auth-user-uuid>',
  '<admin-name>',
  '<admin-email>',
  '<admin-phone>',
  '<admin-agent-code>',
  null,
  'DANG_HOAT_DONG'
);

insert into public.phan_cong_vai_tro (
  tai_khoan_id,
  vai_tro_id,
  nguoi_gan_id
)
select
  '<auth-user-uuid>'::uuid,
  vt.id,
  null
from public.vai_tro vt
where vt.ma_vai_tro = 'ADMIN';

commit;
```

4. Sign in through the normal password flow and verify `/admin/accounts`.

The secret/service-role credential is only for this explicit bootstrap/setup operation. Normal Admin UI requests use the Admin user's JWT and database authorization; they do not use the server secret as a general authorization bypass.

## Local and automated tests

Database and integration tests may create deterministic Admin fixtures with privileged setup access. Authorization assertions and Phase 3 mutations themselves must use authenticated user-scoped JWTs.

## Account deletion

Account deletion is intentionally deferred from the Phase 3 MVP. The existing schema uses conservative `RESTRICT` semantics for business-owned records, and coordinated deletion behavior requires a separate source-backed decision.
