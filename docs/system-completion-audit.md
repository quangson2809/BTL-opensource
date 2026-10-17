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
| Reports and CSV export | Role/scope as returned by report RPC | Personal + authorized subtree | Personal + authorized subtree | Personal scope | `/reports`, `/reports/export`; `report_scope` | RPC checks active session/scope, CSV uses UTF-8 BOM and formula escaping; tests 006/007 | **IMPLEMENTED in code**; production data and browser download not separately verified |
| UI/application shell/accessibility | Role navigation is guarded server-side | Same | Same | Same | shared `AppFrame`, PageHeader, EmptyState, LoadingState, ErrorState, list controls | Phase 1–2 acceptance doc marks keyboard/browser screenshots as unchecked | **PARTIAL** — existing shell/component work retained; 375/768/1024/1440 screenshots, screen-reader and cross-role browser smoke remain UNVERIFIED |
| Production deployment readiness | Same deployment gate for all roles | Same | Same | Same | Vercel + hosted Supabase + SMTP/Auth settings | Issue #13 and `docs/mvp-deployment.md` require real OTP configuration readback, reauth/recovery, smoke and redacted evidence | **UNVERIFIED/PENDING** — a green baseline workflow or deployment status is not production acceptance |

## 3. Changes implemented on this branch

1. Added migration `supabase/migrations/20261017060000_notification_draft_management.sql` with two narrow, authenticated-only, DM-guarded RPCs for updating/deleting the creator's own draft. The existing `ĐÃ_GỬI` state cannot be updated or deleted through these operations.
2. Added `supabase/tests/database/009_notification_draft_management_test.sql` covering grants, non-DM denial, outside-subtree recipients, atomic draft update, duplicate-recipient de-duplication, draft deletion/cascade and sent-notification immutability.
3. Added `src/app/notifications/[id]/edit/page.tsx`; updated `src/app/notifications/actions.ts` and `src/app/notifications/page.tsx` to expose edit/delete controls only for the owner's draft.
4. Added `src/lib/list-query.mjs` and its declaration; added unit coverage for conservative search sanitization and strict positive-page parsing.
5. Changed customer, activity, notification and Admin account lists to apply supported filters in the database, calculate exact filtered counts, clamp invalid/out-of-range page numbers, use deterministic order with an ID tie-breaker, request only the visible page and avoid loading unrelated activity-account/notification-recipient rows.
6. Updated `PROJECT_PLAN.md`, `docs/action-contracts.md` and `docs/business-change-log.md` to describe the draft-only owner decision and new database boundaries. PDF alignment has not been claimed.

No production migration or business-data mutation was executed. The new migration is only committed to this feature branch.

## 4. Test/acceptance evidence

| Check | Result at audit write time | Evidence / limitation |
|---|---|---|
| Baseline CI | **PASS on base commit only** | GitHub workflow run `38994643483` for `3b137b7d8d09772c097926e9b773f6483a514565`; does not prove changed branch passes |
| Baseline Database Tests | **PASS on base commit only** | Run `38994643495` for base commit; does not exercise the new migration/test |
| New list-query unit test | Added, **not yet run** | `tests/interaction-contracts.test.mjs`; requires changed-branch CI |
| New pgTAP draft-management tests | Added, **not yet run** | `supabase/tests/database/009_notification_draft_management_test.sql`; requires `supabase db reset` and `supabase test db` on PR CI |
| Lint/type-check/build | **PENDING on changed head** | No local repository checkout/runtime is available through the connected GitHub tool; do not infer from baseline |
| Role-sensitive E2E/browser tests | **UNVERIFIED** | No browser automation was available through the GitHub connector for this audit |
| Responsive screenshots (375/768/1024/1440) and keyboard/screen-reader test | **NOT RUN** | Must be done in an actual browser |
| Production OTP/Auth/SMTP | **UNVERIFIED** | No real hosted OTP codes or session credentials were accessed; Issue #13 remains the acceptance tracking point |
| PDF exact page/section evidence | **UNVERIFIED** | PDF binary contents could not be read/rendered in this connector session |

## 5. Remaining decisions, blockers and backlog

### Blocker — Role/permission catalog editing
The previously selected direction asks for Admin to create/edit roles and configure permissions. The checked-in `PROJECT_PLAN.md`/Issue #9 instead keeps the catalog read-only for the MVP and defers CRUD. Do not add role CRUD until the project owner reconciles this with the canonical PDF and records the decision; this avoids changing privilege policy from an unresolved contract.

### Production acceptance
- Verify hosted email OTP length is 8 digits and expiry is 600 seconds by reading settings back from the actual project; run real reauthentication and recovery delivery/verification with a permitted demo mailbox.
- Do not claim exact 6-failure/30-minute lock enforcement on hosted Free (BC-001), and do not claim unrestricted SMTP for arbitrary addresses (BC-002).
- Run real authenticated flows for ADMIN/DM/UM/SA and record redacted evidence without OTP, password, JWT or secret values.
- Inspect the latest Vercel deployment and effective environment configuration without exposing secret values; run unauthenticated and authenticated smoke tests.

### Browser/UX acceptance
- Exercise role navigation, validation, loading/empty/error/retry, confirmation cancellation/acceptance and authorization denial for each mutation at 375, 768, 1024 and 1440 CSS pixels.
- Perform keyboard-only checks for drawer/account menu/dialog and a screen-reader smoke.
- Verify CSV download and formula-escaping behavior in Excel-compatible software.

### Not added
Manager reassignment/transfer, role catalog CRUD (pending the decision blocker above), customer-to-activity linkage, Excel import, sent-notification edit/delete, insurance contracts/claims/premiums, sales orders, carts, revenue KPI, CRM integration and other requirements not established for the current scope.
