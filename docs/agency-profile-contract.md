# Agency profile contract

## Baseline

- Repository: quangson2809/BTL-opensource.
- Base branch: updateUx/ui.
- Base commit: 1749fdc0cd69725db539019db24a2b5817877a03.
- Feature branch: feature/agency-profile.
- Existing behavior at audit: no dedicated profile route or self-service profile mutation. The authenticated shell reads the current user's name and email for the account summary.
- Canonical schema: public.tai_khoan; role names come from phan_cong_vai_tro joined to vai_tro.
- The profile scope now explicitly permits self-service phone-number updates. Email remains read-only because it is mirrored to Supabase Auth and needs a separate verified email-change flow.

## Data contract

The route is /profile. The page reads the account ID from the server-side authenticated session and queries that same row using the session-bound Supabase client. The Server Action accepts ho_ten and so_dien_thoai; it never accepts an account ID, role, status, or manager ID from the client.

The self-service write contract permits ho_ten and so_dien_thoai. The server trims the name, rejects control characters, validates phone format, and writes only these two columns on the authenticated account row. Duplicate phone values are rejected by the database unique constraint and mapped to a safe user-facing message. After a successful write the route redirects back to /profile with a success state. Database/provider details are not returned to the browser.

## Field access matrix

| Field | Display | Self-edit | Reason |
|---|---|---|---|
| id | Yes, read-only | No | Primary key tied to auth.users.id; must remain stable. |
| ho_ten | Yes | Yes | Display name only; no authentication or authorization state is changed. |
| email | Yes, read-only | No | Mirrored Auth identity. Needs a verified Supabase Auth email-change flow and safe synchronization before permitting change. |
| so_dien_thoai | Yes | Yes | Format-validated self-service contact field; the database unique constraint prevents duplicate ownership. This flow does not change Auth identity or account authorization. |
| ma_dai_ly | Yes, read-only | No | Official unique agency code assigned during provisioning. |
| manager_id | Relationship state only | No | Official manager relationship established by registration/provisioning and protected by RLS/RPC workflows. The page does not broaden reads to reveal a manager outside the caller's existing scope. |
| Role assignments | Yes, read-only | No | Stored in phan_cong_vai_tro; only privileged role-management flows may mutate these assignments. |
| trang_thai | Yes, read-only | No | Approval/lock state is system-managed and enforced by the application-access gate. |
| created_at | Yes, read-only | No | System timestamp. |
| updated_at | Yes, read-only | No | Managed by the database trigger. |
| dang_nhap_sai_lien_tiep, khoa_tam_den | Not displayed | No | Authentication security state; not profile data. |

## Authorization and RLS

- The Server Action calls requireActiveBusinessAccount() and uses its accountId derived from authenticated claims.
- The update statement can write only ho_ten and so_dien_thoai and scopes the row by the session's accountId.
- Migration 20261024090000_agency_profile_self_update.sql initially grants UPDATE on ho_ten; follow-up migration 20261024160000_agency_profile_phone_update.sql grants UPDATE on ho_ten and so_dien_thoai while retaining the own-row policy requiring application access.
- Email, official agency code, manager relationship, status, primary key, timestamps and lockout fields have no authenticated UPDATE privilege through the table API.
- RLS remains active; an attempted update targeting another account yields no updated row.
- Role assignments stay in their existing separate table and privileged database workflows.

## Tests and verification

- Unit/contract tests cover required-value validation, control-character rejection, session-derived target selection, success/error UI semantics, and the column-level grant contract.
- pgTAP coverage checks allowed name and phone updates, denied cross-account writes, and denied changes to account ID, manager relationship and account status; it verifies all other system-managed fields lack UPDATE privilege.
- Database Tests CI also includes /profile in unauthenticated route-smoke coverage.

## Decision required before widening editing rights

PENDING PRODUCT OWNER DECISION: whether email may be changed and what verified Supabase Auth synchronization flow must apply. Email remains read-only.

Phone updates are explicitly scoped to format validation and uniqueness. This feature does not claim to verify phone ownership through OTP; add an OTP verification contract separately if ownership verification is required.
