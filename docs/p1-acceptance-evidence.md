# P1 — Authentication and Registration Acceptance Evidence

**Review date:** 2026-10-23  
**Repository baseline:** `main` at `4d150f54278ddf0cbd42e8eb59123068f9c6a0df`  
**Scope:** self-registration, email callback, direct manager validation, pending approval, session authorization, password recovery and reauthentication OTP.

## Business decisions applied

1. Self-registration creates only the `SA` role. Client-supplied role metadata and manager UUIDs are ignored.
2. Registration requires a direct-manager agency code that resolves to an active account with role `DM` or `UM`. The database independently revalidates this code during Auth-user provisioning.
3. `manager_id` is persisted at registration time to preserve the submitted reporting line while the new account is pending. The new account remains `CHO_PHE_DUYET`; it receives no business-data access until Admin approval. There is no manager transfer/reassignment workflow in P1.
4. Pending, administratively locked and temporarily locked accounts must not retain application access, including through an already-issued JWT. Rejected login states clear the local session.
5. Account lifecycle remains approve/lock/unlock only; account deletion is out of scope.
6. Password recovery and authenticated password change use Supabase Auth OTP flows. The required hosted OTP contract remains eight digits with a 600-second expiry; local configuration alone is not evidence of hosted configuration.

## Implementation and evidence

- The source migration `supabase/migrations/20261017130000_registration_manager_validation.sql` contains the database-authoritative manager validation.
- The matching migration was applied to hosted Supabase project `kulaguukpngkzpwforok` on 2026-10-23. Supabase recorded deployment version `20261023094118` (`registration_manager_validation`). The live function definition was read back and confirmed to validate active DM/UM and write the resolved `manager_id`.
- Existing regression test `supabase/tests/database/013_registration_manager_validation_test.sql` covers valid DM/UM, invalid/missing manager, inactive manager, rejection of SA as manager, and ignoring client-supplied role/manager IDs.
- Existing Auth integration tests `supabase/tests/auth/001_phase2_auth.mjs` and `002_password_otp.mjs` cover pending-state isolation, role assignment, failed registration rollback, temporary lockout, session refresh/logout, recovery OTP and password reauthentication.
- CI on baseline SHA `4d150f54278ddf0cbd42e8eb59123068f9c6a0df` completed successfully:
  - CI run: https://github.com/quangson2809/BTL-opensource/actions/runs/39635514091
  - Database Tests run: https://github.com/quangson2809/BTL-opensource/actions/runs/39635513741

## Acceptance status

| Criterion | Status | Evidence / remaining condition |
|---|---|---|
| Registration assigns SA and starts pending | PASS (code/test) | Auth integration and DB tests on baseline |
| Direct manager is validated and persisted | PASS (source + hosted migration) | Live function read-back; migration `20261023094118` |
| Pending/locked account authorization | PASS (code/test) | Auth integration test covers direct Auth access and RLS isolation |
| Login/logout/session and recovery/reauth flow | PASS (local CI evidence) | CI and Auth integration test suite |
| Hosted OTP length = 8 and expiry = 600 seconds | UNVERIFIED | Hosted Auth configuration cannot be inferred from `supabase/config.toml`; verify project Auth settings and complete a real hosted recovery + reauthentication test |
| Exact six-failure/30-minute lock on hosted Free | NOT A P1 PASS CRITERION FOR HOSTED MVP | `docs/business-change-log.md` BC-001 records this known hosted-Free deviation; local/CI hook tests do not prove hosted enforcement |
| Full original DOCX-to-canonical-PDF requirement mapping | PARTIAL | Keep source-page alignment marked unverified where no exact page/section evidence has been recorded |

## Final gate

P1 is **not fully accepted yet** while hosted OTP configuration and real hosted recovery/reauthentication remain unverified. Do not mark OTP PASS based only on local CI. This document does not claim that tests were rerun against the newly updated hosted database; the successful GitHub Actions runs above belong to the baseline commit before the hosted migration was applied.
