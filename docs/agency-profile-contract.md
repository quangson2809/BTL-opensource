# Agency profile contract

## Baseline

- Repository: quangson2809/BTL-opensource.
- Base branch: updateUx/ui.
- Base commit: 1749fdc0cd69725db539019db24a2b5817877a03.
- Feature branch: feature/agency-profile.
- Existing behavior at audit: no dedicated profile route or self-service profile mutation. The authenticated shell reads the current user's name and email for the account summary.
- Canonical schema: public.tai_khoan; role names come from phan_cong_vai_tro joined to vai_tro.
- The canonical requirements PDF is the project source of truth. A profile-specific allowed-field policy was not independently verified during this implementation, so contact-field editing remains disabled.

## Data contract

The route is /profile. The page reads the account ID from the server-side authenticated session and queries that same row using the session-bound Supabase client. The Server Action accepts only the ho_ten form value; it never accepts an account ID, role, status, or manager ID from the client.

The current self-service write contract is intentionally limited to ho_ten. The server trims the value, rejects missing values and control characters, and updates only this column. After a successful write the route redirects back to /profile with a success state. Database/provider details are not returned to the browser.

## Field access matrix

| Field | Display | Self-edit | Reason |
|---|---|---|---|
| id | Yes, read-only | No | Primary key tied to auth.users.id; must remain stable. |
| ho_ten | Yes | Yes | Display name only; no authentication or authorization state is changed. |
| email | Yes, read-only | No | Mirrored Auth identity. Needs a verified Supabase Auth email-change flow and safe synchronization before permitting change. |
| so_dien_thoai | Yes, read-only | No | Unique contact field; no approved verification/uniqueness-change contract is present. |
| ma_dai_ly | Yes, read-only | No | Official unique agency code assigned during provisioning. |
| manager_id | Relationship state only | No | Official manager relationship established by registration/provisioning and protected by RLS/RPC workflows. The page does not broaden reads to reveal a manager outside the caller's existing scope. |
| Role assignments | Yes, read-only | No | Stored in phan_cong_vai_tro; only privileged role-management flows may mutate these assignments. |
| trang_thai | Yes, read-only | No | Approval/lock state is system-managed and enforced by the application-access gate. |
| created_at | Yes, read-only | No | System timestamp. |
| updated_at | Yes, read-only | No | Managed by the database trigger. |
| dang_nhap_sai_lien_tiep, khoa_tam_den | Not displayed | No | Authentication security state; not profile data. |

## Authorization and RLS

- The Server Action calls requireActiveBusinessAccount() and uses its accountId derived from authenticated claims.
- The update statement can write only ho_ten and scopes the row by the session's accountId.
- Migration 20261024090000_agency_profile_self_update.sql grants column-level UPDATE on ho_ten only and adds an own-row UPDATE policy requiring application access.
- Email, phone, official agency code, manager relationship, status, primary key, timestamps and lockout fields have no authenticated UPDATE privilege through the table API.
- RLS remains active; an attempted update targeting another account yields no updated row.
- Role assignments stay in their existing separate table and privileged database workflows.

## Tests and verification

- Unit/contract tests cover required-value validation, control-character rejection, session-derived target selection, success/error UI semantics, and the column-level grant contract.
- pgTAP coverage checks allowed name updates, denied cross-account writes, and denied changes to account ID, manager relationship and account status; it also verifies contact/system fields lack UPDATE privilege.
- Database Tests CI also includes /profile in unauthenticated route-smoke coverage.

## Decision required before widening editing rights

PENDING PRODUCT OWNER DECISION: whether email and/or phone may be changed, what verification steps apply, and how the verified Auth identity and public.tai_khoan record must be synchronized. Until the decision and tests exist, both fields remain read-only.

PENDING SOURCE ALIGNMENT: confirm the profile-specific field-edit policy against the canonical PDF or record an approved decision-log entry. This implementation does not infer contact-update permission from column presence alone.
