# IDAILY — Server Action, Route Handler, RPC and UI Contract Inventory

**Scope:** current MVP contract inventory plus verified list-query and draft-notification work on `feature/idaily-system-completion-20261017`.  
**Security boundary:** the UI and navigation are not authorization controls. Server guards, user-scoped Supabase clients, RPC checks and RLS remain authoritative.  
**Database changes:** the branch includes role-guarded notification draft RPCs and a follow-up migration that validates the direct manager during SA provisioning; no business tables or columns are added. Hosted production has not been migrated.

## 1. Server Action inventory

| Server Action | Input / validation | Server authorization and data boundary | Outcome / refresh |
|---|---|---|---|
| register | Required name, email, phone, own agency code, direct manager agency code; password policy (8+ chars, lower/upper/digit) | Server precheck requires an active DM/UM; provisioning trigger independently resolves the code and persists manager_id; role remains database-assigned SA | Safe redirect to login; manager/service errors use safe codes |
| login | Required email/password | Supabase Auth verifies credentials; narrow server-only client reads account state; only DANG_HOAT_DONG proceeds | Inactive/pending/locked states sign out and use safe codes |
| requestPasswordChangeOtp | No client-supplied account ID | Requires signed-in claim and an account row with DANG_HOAT_DONG; calls Supabase reauthentication | otp-sent or safe failure code |
| changePassword | OTP, new password and confirmation; exact match and existing password policy | Rechecks active account; Supabase Auth validates nonce/OTP and password mutation | Sign out after success; redirect to login |
| requestPasswordRecovery | Email required; provider response intentionally does not disclose account existence | Public Supabase recovery API | Generic verify-step response to avoid account enumeration |
| verifyRecoveryOtp | Email, OTP, new password and confirmation | Supabase Auth validates recovery OTP; temporary recovery session is signed out after use and is not promoted to workspace access | Safe error code; redirect to login after success |
| logout | No client-supplied identity | Supabase local-session sign-out | Redirect to login |
| createCustomer | Required fields; date must be a real ISO calendar date; finite type/status/personality values; owner ID is server-derived | requireBusinessAccount; write uses caller JWT and customer RLS | Checks insert result; redirects to detail |
| updateCustomer | UUID customer ID + validated customer payload | requireBusinessAccount; caller JWT and customer RLS enforce ownership | Checks selected row; redirects to detail or safe failure |
| deleteCustomer | UUID customer ID | requireBusinessAccount; caller JWT and customer RLS enforce ownership | Checks deleted row; list receives success/error status |
| createActivity | Allowed activity type; non-empty location; strict local date-time; non-negative 32-bit integer connected count | requireBusinessAccount; account ID is server-derived; caller JWT and RLS | Safe redirect after mutation |
| updateActivity | UUID activity ID and same activity payload validation | requireBusinessAccount; explicit tai_khoan_id = accountId predicate plus RLS | Selected row required before success |
| deleteActivity | UUID activity ID | requireBusinessAccount; explicit owner predicate plus RLS | Selected row required before success |
| createNotification | Non-empty title/content, finite notification type, UUID recipient list (deduplicated) | requireDm plus dm_create_notification; database checks DM role and each recipient's subtree scope | Safe failure code; no provider/database text shown |
| updateNotificationDraft | UUID notification ID, non-empty title/content, finite type and UUID recipient list | requireDm plus dm_update_notification_draft; database locks and checks owned `CHƯA_GỬI` draft, validates recipient subtree, updates content/recipients atomically | Safe failure code; redirects to notifications on success |
| deleteNotificationDraft | UUID notification ID | requireDm plus dm_delete_notification_draft; database locks and checks owned `CHƯA_GỬI` draft; sent/non-owned messages are rejected | Safe failure code; redirects to notifications on success |
| sendNotification | UUID draft ID | requireDm plus dm_send_notification, which checks creator, draft state and recipient scope | Success only when RPC returns without error |
| markNotificationRead | UUID recipient-row ID | requireBusinessAccount; account ID is server-derived, explicit row-owner predicate and recipient RLS | Selected row required before success |
| approveAccount | UUID account ID | requireAdmin plus admin_approve_account role/state checks | Revalidates Admin account/role paths |
| lockAccount | UUID account ID | requireAdmin plus admin_lock_account role/state checks | Revalidates Admin account/role paths |
| unlockAccount | UUID account ID | requireAdmin plus admin_unlock_account role/state checks | Revalidates Admin account/role paths |
| assignRole | UUID account ID and role ID | requireAdmin plus admin_assign_role Admin check and database constraints | Revalidates account detail and role list |
| revokeRole | UUID account ID and role ID | requireAdmin plus admin_revoke_role Admin check and function ACL boundary | Revalidates account detail and role list |
| createRole | Custom role code in uppercase identifier format, non-empty name, existing permission UUIDs | requireAdmin plus admin_create_role; database rejects reserved system codes and invalid permission IDs; role and mapping are created atomically | Safe duplicate/validation errors; revalidates role catalog |
| updateRole | UUID custom-role ID, non-empty name, existing permission UUIDs | requireAdmin plus admin_update_role; database locks role and atomically replaces mapping; system roles are rejected and role codes remain immutable | Safe duplicate/validation errors; revalidates role catalog |

### Shared rules confirmed in code

- Each mutation authenticates/authorizes on the server; hiding a navigation item or button is only a UX measure.
- Caller-owned business data uses the authenticated client, not the service-role client.
- Account IDs and role IDs for Admin RPCs are never accepted as proof of role or ownership.
- User-visible errors are stable codes mapped to Vietnamese text. Unknown error codes use a generic message; unknown success codes do not render a success message.
- Pending buttons and confirmation prompts reduce accidental interaction only. They do not guarantee idempotency or replace database authorization/state checks.
- Role assignments, role catalog mutations and notification create/send/edit/delete retain database-side authorization in RPCs. Role metadata/mapping writes cannot be made directly through the authenticated Data API; permission definitions remain migration-owned.

## 2. Route Handler inventory

| Route | Method | Inputs / behavior | Authorization / response |
|---|---|---|---|
| /reports/export | GET | period and anchor; resolves the supported day/week/month range and returns CSV with UTF-8 BOM and spreadsheet-formula escaping | Requires an authenticated claim (401 otherwise); report_scope enforces active session and caller scope (403 if denied); response is private/no-store |

No other Route Handler was found in the inspected source tree for this baseline. Browser-originated CRUD mutations remain Server Actions rather than duplicate REST endpoints.

## 3. Directly invoked RPC inventory

| RPC | Call sites | Server/database authorization contract |
|---|---|---|
| has_role | Shell, dashboard, notifications, Admin guard, manager guard | Answers role membership for the authenticated caller; does not replace protected-route/server checks |
| personnel_summary(target_account_id) | Personnel detail | Requires an application-access session; allows self or DM/UM accounts in the permitted subtree; returns aggregate counts rather than raw subordinate customer rows |
| report_scope(period_start, period_end) | Reports page and CSV export | Requires an active password-authenticated application session; validates range and returns caller-scoped aggregates |
| admin_approve_account(target_account_id) | Admin account actions | Database independently checks ADMIN and pending state |
| admin_lock_account(target_account_id) | Admin account actions | Database independently checks ADMIN and active state |
| admin_unlock_account(target_account_id) | Admin account actions | Database independently checks ADMIN and locked state |
| admin_assign_role(target_account_id, target_role_id) | Admin account actions | Database independently checks ADMIN, account and role existence; unique assignment constraint handles repeated assignment |
| admin_revoke_role(target_account_id, target_role_id) | Admin account actions | Database independently checks ADMIN |
| admin_create_role(role_code, role_name, role_description, permission_ids) | `/admin/roles/new` | Checks active ADMIN; rejects reserved role codes and invalid permission IDs; role and mappings are created atomically |
| admin_update_role(target_role_id, role_name, role_description, permission_ids) | `/admin/roles/[id]/edit` | Checks active ADMIN; locks role, validates permissions and replaces metadata/mappings in one transaction; role identity is immutable |
| admin_lock_account(target_account_id) | Admin account detail | Checks ADMIN; prevents self-lock and serializes active-Admin protection |
| admin_revoke_role(target_account_id, target_role_id) | Admin account detail | Checks ADMIN; prevents self-revoking ADMIN, protects last active Admin and rejects direct table-DML bypass |
| dm_create_notification(...) | Notification creation | Database independently checks DM and each recipient's subtree membership |
| dm_send_notification(target_notification_id) | Notification send | Database independently checks DM, creator ownership, draft state, and recipient scope |
| dm_update_notification_draft(target_notification_id, notification_title, notification_content, notification_type, recipient_ids) | Draft edit form | Authenticated-only RPC; checks active DM via `has_role`, locks an owned draft, validates all recipient scope, de-duplicates selected recipient IDs and updates atomically |
| dm_delete_notification_draft(target_notification_id) | Draft delete form | Authenticated-only RPC; checks active DM via `has_role`, locks and deletes only an owned `CHƯA_GỬI` draft; recipient rows follow the existing FK cascade; sent notifications are immutable |

Security-definer helpers such as current_account_has_application_access, is_in_subtree, and notification RLS helpers are database implementation details invoked by policies/RPCs, not client-callable workflow endpoints.

## 4. Input validation coverage and limits

| Input class | Current server-side handling | Remaining contract gap |
|---|---|---|
| Enums | Customer type/status/personality, activity type, notification type use finite allow-lists; invalid values stop before mutation | gioi_tinh is stored as text without an enforced finite database catalog; do not invent a new enum before checking the canonical specification |
| Date | Customer birth date must be a real YYYY-MM-DD calendar date; invalid dates (for example February 30) are rejected | Future-date business rule is not encoded because the canonical requirement has not been verified |
| Date-time | Activity datetime-local must be exact YYYY-MM-DDTHH:mm, a valid calendar/time value, and is interpreted in Asia/Ho_Chi_Minh (UTC+07:00) | No extra business date range is imposed |
| Numeric | Connected-customer count accepts decimal digits only and the PostgreSQL non-negative integer range; rejects signs, fractions, exponent notation, negatives and overflow | None for the current numeric field |
| IDs | User-supplied row IDs and notification recipients are checked for UUID shape before database calls | UUID validation is not an authorization check; RLS/RPC remains authoritative |
| Password | Existing minimum/character policy and confirmation equality are validated server-side; OTP validity is delegated to Supabase Auth | Do not print OTPs, passwords or provider internals |
| Text lengths | Required/blank input is validated; schema columns are text with no explicit length CHECK in the inspected migrations | **Open contract decision:** maximum lengths for names, codes, addresses, notes, notification title/content and phone values must come from the canonical specification or owner approval. Do not silently invent business limits. Add matching input maxLength and server checks once authoritative limits are verified. |

## 5. RLS and mutation safety map

- **Customers:** CRUD executes with the authenticated user; row ownership is enforced by RLS. New records derive chu_so_huu_id from the server-authenticated account.
- **Activities:** create derives tai_khoan_id from the authenticated account; update/delete additionally filter by that account. Read access uses `can_view_activity`: own activity or `ACTIVITY_VIEW_SUBTREE` plus `is_in_subtree`; custom-role mappings cannot expand reads outside the caller's tree.
- **Notifications:** drafts are creator-scoped; recipients only read sent notifications addressed to them; da_doc writes are restricted to the caller's recipient row. DM create/send/update/delete RPCs enforce role, owner/state, and subtree checks. Only owned drafts are editable/deletable; sent notifications remain immutable.
- **Admin/RBAC:** custom-role create/update uses guarded RPCs, replacing permission mappings atomically. `ADMIN/DM/UM/SA` are read-only and undeletable; role codes are immutable, permission definitions remain migration-owned, and authenticated direct DML on role catalog/mapping tables is revoked. Admin lock/revoke RPCs protect self-lockout and the last active Admin.
- **Reporting/personnel:** RPCs return scope-limited aggregates and enforce the authenticated caller's allowed scope. Export is not a service-role data bypass. The `/reports` leaderboard ranks only subordinate rows returned by `report_scope`, by activity count for the selected period; ties share rank and no extra account query is performed.
- **Authentication:** changing/recovering a password does not turn an OTP-only recovery session into a workspace session; successful password update signs out the temporary/local session.

## 6. Acceptance gaps still requiring evidence or a source decision

1. Maximum text lengths cannot be declared compliant until the canonical business specification or an explicit product decision establishes limits.
2. CI can verify lint, type-check, interaction/input contracts, security checks, build, database/RLS/Auth tests and route smoke. It does not itself prove real desktop/mobile browser behavior.
3. The browser QA matrix is 375, 768, 1024 and 1440 CSS pixels, including keyboard-only drawer use, account-menu use, confirmation cancellation/acceptance, pending feedback, unauthorized route denial, and mutation success/failure/empty states.
4. Mutation duplication is prevented only where the database operation's existing constraints/state checks guarantee it. A disabled button/confirmation dialog is not an exactly-once guarantee.

**Database change note:** this feature branch adds notification-draft RPCs, role-catalog RPCs, a role-identity trigger, Admin lockout protection, and permission-based activity subtree checks. These migrations have not been applied to hosted production by this branch.
