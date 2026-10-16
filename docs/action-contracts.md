# IDAILY — Server Action, Route Handler, RPC and UI Contract Inventory

**Scope:** acceptance hardening for Phase 1 (Shell/Design System) and Phase 2 (interaction/input contracts).  
**Security boundary:** the UI and navigation are not authorization controls. Server guards, user-scoped Supabase clients, RPC checks and RLS remain authoritative.  
**Schema changes:** none in this phase.

## 1. Server Action inventory

| Server Action | Input / validation | Server authorization and data boundary | Outcome / refresh |
|---|---|---|---|
| register | Required name, email, phone, agency code; password policy (8+ chars, lower/upper/digit) | Public Supabase Auth sign-up; registration metadata remains SA_SELF_REGISTRATION; Auth trigger and database constraints are authoritative | Safe redirect to login; provider error is not exposed |
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
| createNotification | Non-empty title/content, finite notification type, at least one UUID recipient | requireDm plus dm_create_notification, which checks DM role and each recipient's subtree scope | Safe failure code; no provider/database text shown |
| sendNotification | UUID draft ID | requireDm plus dm_send_notification, which checks creator, draft state and recipient scope | Success only when RPC returns without error |
| markNotificationRead | UUID recipient-row ID | requireBusinessAccount; account ID is server-derived, explicit row-owner predicate and recipient RLS | Selected row required before success |
| approveAccount | UUID account ID | requireAdmin plus admin_approve_account role/state checks | Revalidates Admin account/role paths |
| lockAccount | UUID account ID | requireAdmin plus admin_lock_account role/state checks | Revalidates Admin account/role paths |
| unlockAccount | UUID account ID | requireAdmin plus admin_unlock_account role/state checks | Revalidates Admin account/role paths |
| assignRole | UUID account ID and role ID | requireAdmin plus admin_assign_role Admin check and database constraints | Revalidates account detail and role list |
| revokeRole | UUID account ID and role ID | requireAdmin plus admin_revoke_role Admin check and function ACL boundary | Revalidates account detail and role list |

### Shared rules confirmed in code

- Each mutation authenticates/authorizes on the server; hiding a navigation item or button is only a UX measure.
- Caller-owned business data uses the authenticated client, not the service-role client.
- Account IDs and role IDs for Admin RPCs are never accepted as proof of role or ownership.
- User-visible errors are stable codes mapped to Vietnamese text. Unknown error codes use a generic message; unknown success codes do not render a success message.
- Pending buttons and confirmation prompts reduce accidental interaction only. They do not guarantee idempotency or replace database authorization/state checks.
- Role assignments and notification creation/sending retain database-side authorization in the RPC. No new RPC, role or permission was added here.

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
| dm_create_notification(...) | Notification creation | Database independently checks DM and each recipient's subtree membership |
| dm_send_notification(target_notification_id) | Notification send | Database independently checks DM, creator ownership, draft state, and recipient scope |

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
- **Activities:** create derives tai_khoan_id from the authenticated account; update/delete additionally filter by that account. Manager read access remains constrained by the existing policy/scope logic.
- **Notifications:** drafts are creator-scoped; recipients only read sent notifications addressed to them; da_doc writes are restricted to the caller's recipient row. DM create/send RPCs repeat their role and subtree checks.
- **Admin/RBAC:** the route guard and RPC both check ADMIN; the existing database function ACL migration limits execution to authenticated callers and functions verify role in SQL. UI visibility is not trusted.
- **Reporting/personnel:** RPCs return scope-limited aggregates and enforce the authenticated caller's allowed scope. Export is not a service-role data bypass.
- **Authentication:** changing/recovering a password does not turn an OTP-only recovery session into a workspace session; successful password update signs out the temporary/local session.

## 6. Acceptance gaps still requiring evidence or a source decision

1. Maximum text lengths cannot be declared compliant until the canonical business specification or an explicit product decision establishes limits.
2. CI can verify lint, type-check, interaction/input contracts, security checks, build, database/RLS/Auth tests and route smoke. It does not itself prove real desktop/mobile browser behavior.
3. The browser QA matrix is 375, 768, 1024 and 1440 CSS pixels, including keyboard-only drawer use, account-menu use, confirmation cancellation/acceptance, pending feedback, unauthorized route denial, and mutation success/failure/empty states.
4. Mutation duplication is prevented only where the database operation's existing constraints/state checks guarantee it. A disabled button/confirmation dialog is not an exactly-once guarantee.

**No schema, RLS policy, business role, or RPC implementation is changed by this acceptance-hardening phase.**
