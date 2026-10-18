# IDAILY — System completion audit and acceptance matrix

**Audit date:** 2026-10-17  
**Repository:** `quangson2809/BTL-opensource`  
**Working branch:** `feature/idaily-system-completion-20261017`  
**Base branch/SHA:** `updateUx/ui` @ `3b137b7d8d09772c097926e9b773f6483a514565`  
**Canonical specification:** `docs/source/Bao-cao-mon-opensource.pdf` — the repository identifies this file as the source of truth, but the GitHub connector used for this audit cannot retrieve/render its binary contents. Exact PDF page/section mapping remains **UNVERIFIED**.

## 1. Status definitions

| Status | Meaning |
|---|---|
| `IMPLEMENTED` | Code and an identifiable implementation path exist; do not infer production acceptance from code alone. |
| `PARTIAL` | Some paths exist, but a confirmed flow, environment check, UX state or acceptance step remains. |
| `BUG` | Incorrect behavior is reproduced or a concrete code defect is confirmed. |
| `MISSING` | A confirmed requirement has no implementation. |
| `UNVERIFIED` | Available evidence is insufficient to conclude. |
| `OUT_OF_SCOPE` | Explicitly deferred or excluded by a recorded product/business decision. |

Missing tests or screenshots alone are not classified as a missing feature.

## 2. Role × screen × action/RPC × data-boundary matrix

| Capability | ADMIN | DM | UM | SA | Screen / action / RPC | RLS / test evidence | Audit status |
|---|---|---|---|---|---|---|---|
| SA self-registration and pending approval | Approves through Admin account flow | No approval bypass | No approval bypass | Public registration creates pending SA | `/register`, `/login`, `src/app/auth/actions.ts`, `approveAccount`, `admin_approve_account` | Auth trigger/migrations and `supabase/tests/auth/*`; account state checked at server and DB boundary | **PARTIAL** — hosted delivery/OTP contract is not yet verified |
| Login/logout/password change/recovery | Same Auth boundary; role does not bypass account state | Same | Same | Same | `src/app/auth/actions.ts`; `/password/change`, `/password/recovery` | Auth integration tests are local/CI evidence only; `docs/mvp-deployment.md` records hosted OTP 8-digit/600-second gate | **PARTIAL** — hosted OTP values and real reauthentication/recovery are UNVERIFIED; BC-001/BC-002 demo limitations remain |
| Account approve/lock/unlock | Allowed through protected Admin actions | Denied | Denied | Denied | `/admin/accounts`, `/admin/accounts/[id]`; `admin_approve_account`, `admin_lock_account`, `admin_unlock_account` | RPCs check ADMIN and valid state transitions; RLS application-access gate; DB tests 005/007 and Auth tests | **IMPLEMENTED in code**; changed-branch regression still requires CI |
| Assign/revoke account role | Existing assignments allowed | Denied | Denied | Denied | `/admin/accounts/[id]`; `assignRole`, `revokeRole`; `admin_assign_role`, `admin_revoke_role` | Admin guard + DB role check + function ACL tests | **IMPLEMENTED in code** |
| Role/permission catalog CRUD | Existing screen is read-only | No management controls | No management controls | No management controls | `/admin/roles`; reads `vai_tro`, `quyen`, `phan_quyen_vai_tro` | `PROJECT_PLAN.md` Phase 3 and Issue #9 describe catalog CRUD as deferred for MVP | **DECISION CONFLICT** — a newer owner-selected direction requests create/edit and permission configuration, but the current plan says read-only until the canonical requirement/Decision Log is reconciled. No CRUD was added in this branch. |
| Personnel tree and detail | Not presumed to have unrestricted hierarchy access | Views permitted subtree | Views permitted subtree | Manager-only routes should deny | `/personnel`, `/personnel/[id]`; `personnel_summary(target_account_id)` | Caller RLS, `requireManager`, subtree checks; aggregates are returned instead of subordinate customer rows | **IMPLEMENTED in code** for view/detail and aggregate scope. Transfer/reassignment is intentionally not added. |
| Customer CRUD/details | No cross-owner bypass | Own permitted rows only | Own permitted rows only | Own permitted rows only | `/customers`, `/customers/[id]`, edit/new pages, customer Server Actions | `khach_hang` owner policies constrain SELECT/INSERT/UPDATE/DELETE; DB test 005 exercises ownership | **PARTIAL** — filtering/pagination moved to DB on this branch; changed-branch CI pending |
| Activity CRUD and history | Only what guard/policies permit | Scoped read according to `can_view_activity`; own writes only | Scoped read according to `can_view_activity`; own writes only | Own writes and permitted reads | `/activities`, new/edit pages and `src/app/activities/actions.ts` | Activity RLS, explicit owner predicates for update/delete, DB test 005 | **PARTIAL** — database filtering/pagination and page-local performer lookup added; changed-branch CI pending |
| Dashboard | Real account counts and pending approvals are Admin-only | RLS-scoped metrics | RLS-scoped metrics | RLS-scoped metrics | `/dashboard` | Exact counts for customers/activities, unread notifications, latest five visible activities; no sales revenue/pipeline KPI | **IMPLEMENTED in code**; per-role browser checks remain |
| Notifications: create/send/receive/read | No assumed DM powers | Can create/send to own subtree | Receives only addressed sent items when in recipient scope | Receives only addressed sent items when in recipient scope | `/notifications`, `/notifications/new`, `createNotification`, `sendNotification`, `markNotificationRead`; `dm_create_notification`, `dm_send_notification` | Recipient visibility only after send; DM and subtree checks in RPC; DB test 005 | **IMPLEMENTED in existing code** |
| Notifications: edit/delete | No assumed DM powers | Only own drafts can edit/delete | Cannot edit/delete | Cannot edit/delete | New `/notifications/[id]/edit`; `updateNotificationDraft`, `deleteNotificationDraft`; new `dm_update_notification_draft`, `dm_delete_notification_draft` | Additive migration locks and checks owned `CHƯA_GỬI` rows; recipient subtree validated; sent notifications rejected; new DB test 009 | **IMPLEMENTED on branch; ACCEPTANCE PENDING** — requires exact-branch CI/database test |
| Reports, leaderboard and CSV export | Role/scope as returned by report RPC | Personal + authorized subtree | Personal + authorized subtree | Personal scope | `/reports`, `/reports/export`; `report_scope`; `rankReportRows` | RPC checks active session/scope; leaderboard ranks only subordinate rows returned by the caller-scoped RPC; CSV uses UTF-8 BOM and formula escaping | **IMPLEMENTED on branch** — activity-count leaderboard added with deterministic ties and unit tests; browser download, visual review and production data remain unverified |
| UI/application shell/accessibility | Role navigation is guarded server-side | Same | Same | Same | shared `AppFrame`, PageHeader, EmptyState, LoadingState, ErrorState, list controls | Phase 1–2 acceptance doc marks keyboard/browser screenshots as unchecked | **PARTIAL** — existing shell/component work retained; 375/768/1024/1440 screenshots, screen-reader and cross-role browser smoke remain UNVERIFIED |
| Production deployment readiness | Same deployment gate for all roles | Same | Same | Same | Vercel + hosted Supabase + SMTP/Auth settings | Issue #13 and `docs/mvp-deployment.md` require real OTP configuration readback, reauth/recovery, smoke and redacted evidence | **UNVERIFIED/PENDING** — a green baseline workflow or deployment status is not production acceptance |

## 2. Role × screen × action/RPC × data-boundary matrix

| Capability | ADMIN | DM | UM | SA | Screen / action / RPC | RLS / test evidence | Audit status |
|---|---|---|---|---|---|---|---|
| SA self-registration and pending approval | Approves through protected account actions | No approval bypass | No approval bypass | Public registration creates pending SA | `/register`, `/login`, auth Server Actions, `admin_approve_account` | Auth trigger/migrations; database tests and Auth integration suite | **PARTIAL** — CI proves local contract only; hosted OTP/email/reapproval behavior remains unverified |
| Login/logout/password change/recovery | Same Auth boundary; role does not bypass account state | Same | Same | Same | `src/app/auth/actions.ts`; `/password/change`, `/password/recovery` | CI Auth integration tests pass; `docs/mvp-deployment.md` defines hosted OTP acceptance gate | **PARTIAL** — actual hosted OTP 8-digit/600-second settings, SMTP, reauth and recovery mail have not been verified |
| Account approve/lock/unlock | Allowed through protected Admin actions | Denied | Denied | Denied | `/admin/accounts`, `/admin/accounts/[id]`; `admin_approve_account`, `admin_lock_account`, `admin_unlock_account` | DB test 004 and 011; active-account/RPC checks | **IMPLEMENTED in code + DB tests**; live multi-role browser flow still unverified |
| Assign/revoke account role | Allowed through protected Admin actions | Denied | Denied | Denied | `/admin/accounts/[id]`; `assignRole`, `revokeRole`; `admin_assign_role`, `admin_revoke_role` | DB role guard/ACL tests; last-Admin and self-revoke protections in migration 011 | **IMPLEMENTED in code + DB tests** |
| Role catalog / permission mapping | Creates/edits custom roles and maps existing permissions | No catalog mutation | No catalog mutation | No catalog mutation | `/admin/roles`, `/admin/roles/new`, `/admin/roles/[id]/edit`; `createRole`, `updateRole`; `admin_create_role`, `admin_update_role` | Migration 010 guards; authenticated direct DML revoked; tests 010–012 | **IMPLEMENTED on branch** — custom roles only. Built-in `ADMIN/DM/UM/SA` are read-only, immutable and undeletable; permission definitions remain migration-owned |
| Personnel tree and detail | No assumed unrestricted hierarchy read | Views permitted subtree | Views permitted subtree | Manager-only routes deny | `/personnel`, `/personnel/[id]`; `personnel_summary(target_account_id)` | Caller RLS, `requireManager`, subtree checks; aggregate-only RPC | **IMPLEMENTED in code** for view/detail and aggregate scope. Manager reassignment remains intentionally out of scope |
| Customer CRUD/details | No cross-owner bypass | RLS scope applies | RLS scope applies | Own permitted records | `/customers`, detail/edit/new and customer Server Actions | Ownership RLS; database tests 005; database-side filters, exact count, deterministic pagination | **IMPLEMENTED in code + CI** for current list contract; authenticated browser CRUD/mobile acceptance remains unverified |
| Activity CRUD/history | Scope remains caller/RLS-driven | Own writes; reads descendants only with mapped permission | Own writes; reads descendants only with mapped permission | Own writes; reads own/descendants only when mapped | `/activities`, new/edit; `can_view_activity`; `ACTIVITY_VIEW_SUBTREE` | Migration 012 makes mapping authoritative; DB tests 002 and 012 cover descendants vs out-of-scope rows | **IMPLEMENTED in code + DB tests**; filters/page ranges are database-side; browser interaction/UX evidence remains pending |
| Dashboard | Real account totals and pending approvals are Admin-only | RLS-scoped metrics | RLS-scoped metrics | RLS-scoped metrics | `/dashboard` | Exact customer/activity counts, unread notification count, latest five visible activities; no sales-revenue/pipeline KPI | **IMPLEMENTED in code**; role-specific browser rendering remains unverified |
| Notifications: create/send/receive/read | No assumed DM powers | Can create/send to own subtree | Receives only addressed sent items within policy | Receives only addressed sent items within policy | `/notifications`, `/notifications/new`; create/send/read actions and RPCs | DB test 005; receiver visibility/read-state constraints remain in RLS | **IMPLEMENTED in code + CI** |
| Notifications: edit/delete | No assumed DM powers | Only own drafts can edit/delete | Cannot edit/delete | Cannot edit/delete | `/notifications/[id]/edit`; `updateNotificationDraft`, `deleteNotificationDraft`; `dm_update_notification_draft`, `dm_delete_notification_draft` | Migration 009 row lock/ownership/state/subtree validation; DB test 009 verifies direct calls and sent-message immutability | **IMPLEMENTED in code + DB tests**; sent notifications remain immutable |
| Reports and CSV export | Scope/role from report RPC | Personal + authorized subtree | Personal + authorized subtree | Personal scope | `/reports`, `/reports/export`; `report_scope` | DB tests 006/007; UTF-8 BOM and formula escaping implemented | **IMPLEMENTED in code + DB tests**; download/viewer and spreadsheet compatibility not separately tested in browser |
| UI/Application Shell/accessibility | Role navigation protected server-side | Same | Same | Same | `AppFrame`, PageHeader, EmptyState, LoadingState, ErrorState, list controls | CI checks build/contracts and route smoke; no viewport screenshots or screen-reader artifact supplied | **PARTIAL** — 375/768/1024/1440 screenshots, keyboard-only flows and screen-reader acceptance remain unverified |
| Production deployment readiness | Same production gate for all roles | Same | Same | Same | Vercel + hosted Supabase Auth/SMTP | Preview deployments and CI are not production Auth evidence | **UNVERIFIED/PENDING** — hosted OTP config/email, production smoke and redacted evidence still needed |

## 3. Changes implemented on this branch

1. Added `supabase/migrations/20261017060000_notification_draft_management.sql` with two authenticated, DM-guarded RPCs. The creator can only edit/delete a locked `CHƯA_GỬI` draft; recipient subtree is checked atomically; sent notifications remain immutable.
2. Added `src/app/notifications/[id]/edit/page.tsx`, corresponding Server Actions and draft-only list controls. Database test 009 covers DM/non-DM, other DM, outside-subtree recipient, invalid input, cascade, and sent-message immutability.
3. Added `src/lib/list-query.mjs` and `.d.mts`; updated customer, activity, notification and Admin account lists to apply supported filters/counts/pagination in Supabase queries, cap page reads and use deterministic order. Test `tests/interaction-contracts.test.mjs` covers conservative PostgREST search sanitization and page parsing.
4. Added `supabase/migrations/20261017090000_admin_role_catalog_management.sql` with role CRUD/mapping RPCs for custom roles, fixed role-code identity and protection for built-in role rows. Direct authenticated DML on role/permission catalog tables is revoked; permission definitions stay migration-managed.
5. Added `supabase/migrations/20261017100000_rbac_lockout_protection.sql` to prevent self-lock/revoke of ADMIN and prevent concurrent actions from locking/removing the last active Admin. Matching UI controls are hidden where the operation would self-lock; database RPCs remain authoritative.
6. Added `supabase/migrations/20261017110000_permission_based_activity_scope.sql`: `ACTIVITY_VIEW_SUBTREE` mapping now governs descendant activity visibility without hard-coding DM/UM membership, while the active-account/session check and `is_in_subtree` remain required. Database test 012 confirms the custom-role grant affects only the caller's tree.
7. Added/updated pgTAP tests 009–012, updated RLS test 002 to reflect the permission-mapping rule and migration-managed permission definitions, and adjusted the rollback-only missing-SA fixture to disable only the role-protection trigger during setup.
8. Updated `PROJECT_PLAN.md`, `docs/action-contracts.md` and `docs/business-change-log.md` to record BC-004/BC-005; PDF page/section alignment is explicitly unverified.

No hosted production migration or production business-data mutation was executed by this branch.
 
## 4. Test/acceptance evidence

| Check | Result | Evidence / limitation |
|---|---|---|
| GitHub CI | **PASS** on implementation head `4c152dfd37435952cccd2979f9fe69756bf37468` | Run `39020715310`; lint, TypeScript check, interaction/input tests, security-boundary check and build all completed successfully |
| Database migration reset | **PASS** on the same head | Run `39020715323`; local Supabase database recreated and all migrations applied through `20261017110000_permission_based_activity_scope.sql` |
| pgTAP database/RLS tests | **PASS — 13 files, 278 assertions** | `supabase test db` completed with `Files=13, Tests=278, Result: PASS`, including tests 009–012 and the updated test 002 |
| Auth integration tests | **PASS** | Step `Run Auth integration tests` completed successfully using the local CI environment; this does not verify real hosted OTP/email delivery |
| MVP route smoke | **PASS** | Step `Run MVP route smoke` passed on this head, including unauthenticated redirects for `/notifications/[id]/edit`, `/admin/roles/new`, and `/admin/roles/[id]/edit` |
| Vercel preview | **Ready** on implementation head | Preview check `success`; this is not a production deployment/Auth acceptance claim |
| Responsive screenshots / keyboard / screen reader | **NOT RUN** | No browser screenshot artifact or screen-reader evidence was generated; must be checked in a browser at 375/768/1024/1440 CSS px |
| Hosted OTP / SMTP / recovery / production smoke | **UNVERIFIED** | No real hosted OTP or recovery session was used; track under Issue #13 and `docs/mvp-deployment.md` |
| Canonical PDF page/section mapping | **UNVERIFIED** | The connected repository tool could not retrieve/render the binary PDF |

## 5. Remaining decisions, blockers and backlog

### Canonical business document alignment
The binary `docs/source/Bao-cao-mon-opensource.pdf` remains the named source of truth, but page/section references for BC-004 and BC-005 cannot be verified through the current connector. The owner-selected behaviors are recorded in the repository and must not be described as direct PDF quotes until the source is read.

### Production acceptance
- Read back hosted Supabase email OTP length/expiry and verify against the documented 8-digit/600-second contract; run real reauthentication and recovery delivery/verification with an authorized mailbox.
- Do not claim exact 6-failure/30-minute lock enforcement on hosted Free (BC-001), or unrestricted arbitrary-address SMTP (BC-002); retain documented MVP limitations.
- Run authenticated browser flows as ADMIN/DM/UM/SA and record redacted evidence without OTP, password, JWT or secret values.
- Confirm production Vercel effective configuration and run authenticated/unauthenticated smoke against production; a green preview is insufficient.

### Source-derived gaps that cannot be safely completed without a business decision

- **Physical account deletion — BLOCKED.** The uploaded DOCX lists Admin physical account deletion as Must Have (Table 5, function 2.1.5; Table 20, UC-2.1.5). The current implementation supports lock/unlock but not physical deletion. The repository Decision Log still leaves delete/cascade/restrict strategy unresolved. Deleting a user can affect owned customers, activities, notifications/recipients and hierarchy links; no behavior will be guessed. Before implementing, decide whether deletion must cascade through dependent business data, be rejected while dependencies exist, or use another explicitly approved policy. Exact PDF page numbers remain unverified.
- **Contract conversion rate — BLOCKED by source-scope conflict.** DOCX Tables 48–51 (UC-7.1–UC-7.4) specify a contract-conversion metric, while §2.1.2 explicitly excludes insurance-contract operations and the nine-table model has no contract/outcome entity. The app currently reports customer/activity/connected-customer aggregates and does not fabricate a conversion rate. Owner decision is needed: add a minimal, defined conversion outcome data model, or formally accept this metric as deferred for the MVP.
- **Team-vs-team leaderboard — PARTIAL.** This branch adds a subordinate-personnel leaderboard by activity count, using only caller-scoped `report_scope` rows. The RPC does not identify role codes or return team aggregates, so this is not a claim of a true team-vs-team comparison. Agent-only ranking or team aggregation should be added only after the aggregation unit and metric are defined; otherwise the current personnel ranking is the safe bounded implementation.
- **Role deletion and permission-definition CRUD — OUT OF SCOPE by current owner decision.** Although the DOCX includes these use cases, the current owner-selected scope protects built-in roles, does not add custom-role deletion, and keeps permission definitions migration-owned. Do not implement them as part of this remaining-work pass without a new scope decision.

### Browser/UX acceptance
- Exercise role-specific navigation, validation, loading/empty/error/retry, confirmation cancellation/acceptance, pending feedback and authorization denial at 375, 768, 1024 and 1440 CSS px.
- Perform keyboard-only checks for the account menu/dialog/forms and a screen-reader smoke.
- Download CSV in a browser and verify UTF-8/Excel formula handling in spreadsheet software.

### Not added
Manager reassignment/transfer; role deletion; permission-definition CRUD/new permission codes; customer-to-activity linkage; Excel import; sent-notification edit/delete; insurance contracts/claims/premiums; sales orders/carts/revenue KPIs; CRM integration or other requirements not established in the current scope.

## Reporting leaderboard audit update — 2026-10-18

The source report explicitly lists a leaderboard comparing groups or agents as a system objective (paragraph 199). The reports page previously exposed aggregate cards and a comparison table but no ranked view. The follow-up adds a subordinate-scope leaderboard ranked by activity count for the selected day/week/month. It uses only rows already returned by `report_scope`; it does not query or expose additional accounts. Equal activity counts receive the same rank; customer count and Vietnamese name are used only to make ordering deterministic within ties. This is a limited agent/personnel ranking, not a team-level roll-up: the current RPC does not return explicit team aggregates or role codes, so a true team-vs-team leaderboard remains unimplemented rather than inferred.

## Registration direct-manager audit update — 2026-10-17

Before this change, `/register` did not collect a direct-manager code and
`provision_self_registered_sa()` always wrote `manager_id = null` for a
self-registered SA. That left registration disconnected from the existing personnel tree.

The follow-up implementation adds a required manager agent-code field, performs
a server-side eligibility precheck, and makes the Auth provisioning trigger
authoritatively resolve the code to an active DM/UM account before writing
`manager_id`. The client cannot choose a role or submit a manager UUID. Database
regression coverage verifies DM and UM success plus missing, unknown, inactive,
and non-manager rejection cases.

The migration has not been applied to hosted production. CI/database-test status
for this follow-up must be read from the new PR head; baseline results above are
not evidence for this change. Hosted email/OTP acceptance and production smoke
remain separate, unverified gates.
