# IDAILY — System, API & UX Audit and Phase Roadmap

**Branch:** `updateUx/ui`  
**Baseline commit:** `cc37305a1f267067469446c944e1ef5383f42852`  
**Base:** `main` at `b435955eda3a0dd14973afdf5df9040ac9764797`  
**Related UI PR:** [#17](https://github.com/quangson2809/BTL-opensource/pull/17) — open, not merged when this audit was written.  
**Audit mode:** repository/code inspection and workflow status; no production database was queried and no browser screenshots were captured.

## 1. Executive summary

IDAILY is not an empty prototype. The repository already contains a Next.js App Router application, Supabase Auth/session integration, PostgreSQL schema and RLS migrations, server actions/RPCs for core business flows, and pages for customers, activities, personnel, notifications, reports, and Admin/RBAC. The problem is that the application is still presented and experienced like a collection of basic forms and links rather than a cohesive business application.

The current UI branch improves global styles, the landing page, responsive CSS, focus states, and accessible success/error announcements. It does **not** materially expand business functionality, the authenticated application shell, API contracts, data workflows, or page-level interactions. That is consistent with PR #17's stated scope.

**Recommendation:** preserve the existing MVP's security and business boundaries; first improve the application shell and data workflows, then evolve each module end-to-end (requirement → data contract → server authorization → query/mutation → UI states → tests). Do not introduce a separate REST API layer solely for appearance. Existing Next.js Server Actions and Supabase RPCs can remain the internal mutation/query boundary; add Route Handlers only for a justified external client, webhook, or integration use case.

## 2. Repository evidence and current baseline

### Existing foundation

- **Frontend/runtime:** Next.js 16 App Router, React 19, TypeScript; scripts for lint, type-check, build, and a secret-boundary check are defined in `package.json`.
- **Authentication:** `src/app/auth/actions.ts` implements registration, password login, OTP reauthentication/change and recovery flows; Supabase server/browser clients are separated under `src/lib/supabase/`.
- **Authorization:** `src/lib/business.ts` provides account, manager, and DM guards; role checks use the `has_role` RPC. Database authorization must continue to be enforced by RLS/RPC, not only by hiding links.
- **Business modules already represented in routes:**
  - Customers: `src/app/customers/`
  - Activities: `src/app/activities/`
  - Personnel hierarchy: `src/app/personnel/`
  - Notifications: `src/app/notifications/`
  - Reports and CSV export: `src/app/reports/`
  - Admin account/role management: `src/app/admin/`
  - Dashboard: `src/app/dashboard/page.tsx`
- **Database:** migrations exist for core schema/RLS, Auth/session gates, Admin/RBAC, customer/personnel/activity/notification workflows, reporting, and production function ACLs under `supabase/migrations/`.
- **Testing/CI:** `.github/workflows/ci.yml` and `.github/workflows/database-tests.yml`; SQL database/RLS tests and Auth integration tests exist under `supabase/tests/`.
- **Business/deployment documentation:** `PROJECT_PLAN.md`, `docs/business-change-log.md`, `docs/mvp-deployment.md`.

### Confirmed UX limitations from inspected code

1. **Dashboard is only a greeting and a row of links.** It checks roles, but does not present role-aware KPIs, pending work, recent activity, or a clear navigation hierarchy (`src/app/dashboard/page.tsx`).
2. **Shared application shell is not yet established.** `src/app/layout.tsx` currently wraps children in a bare body; authenticated routes mostly render their own card and repeat a link back to Dashboard. The new homepage is not a replacement for an authenticated sidebar/topbar.
3. **Customer filtering is performed after fetching rows.** `src/app/customers/page.tsx` selects the list, then filters search/type/status/group in application code. For larger data sets, move filtering, pagination, and counts into database queries/RPCs while preserving RLS.
4. **Activity list performs broad account lookup for display names.** `src/app/activities/page.tsx` fetches activities and account names separately. The display query must be reviewed to ensure the authenticated role only receives names within its authorized scope; prefer a scoped RPC/view or explicit permitted join.
5. **Error handling is mostly generic redirects/messages or thrown errors.** Standardized field validation, empty/loading/error/retry states, safe error identifiers, and consistent success feedback should be implemented without leaking database/provider internals.
6. **The visual upgrade is global, not module-complete.** PR #17 updates `globals.css`, the public landing page, and accessible announcements on auth pages. It does not yet redesign all authenticated page workflows or add new business APIs.
7. **The product specification must remain authoritative.** `PROJECT_PLAN.md` and `docs/source/README.md` state that `docs/source/Bao-cao-mon-opensource.pdf` is canonical and must be checked before changing requirements. The PDF's actual contents were not independently reviewed during this audit; any new business capability beyond the existing scope needs a verified source reference or an approved decision-log entry.

### Current verification snapshot

At the time of the audit, GitHub Actions reported **CI #99 success** and **Database Tests #96 success** for baseline commit `cc37305a1f267067469446c944e1ef5383f42852`. The combined commit status reported Vercel success. This establishes that the configured checks passed for that commit; it does not replace browser-based visual/accessibility QA or production smoke testing.

## 3. Gap analysis and priority

| Priority | Gap | Why it matters | Proposed response |
|---|---|---|---|
| P0 | No cohesive authenticated shell | Users must orient themselves through scattered links; the app feels unfinished | Role-aware sidebar/topbar, breadcrumb, active state, account menu, mobile navigation |
| P0 | Core page states are inconsistent | Failures and empty data look like dead ends | Shared page/header, table, form, empty/error/loading state and feedback patterns |
| P0 | Customer search/filter work happens in memory | Unbounded fetches increase latency and can produce poor list UX | Server-side filtering, deterministic sorting, pagination and result counts under RLS |
| P0 | Need re-verification of role scope on every read/write | UI links are not a security boundary; broad queries risk overexposure | Map every action/query to a role/scope matrix; test allow and deny paths |
| P1 | Dashboard lacks useful operational context | The landing page gives no immediate sense of work to do | Role-scoped KPIs and recent records derived only from existing authorized data |
| P1 | Module layouts and interaction patterns are inconsistent | Each module feels like a separate demo | End-to-end UX for customers, activities, personnel, notifications, reports and Admin |
| P1 | API/query contracts are implicit across pages/actions/RPCs | Changes can duplicate validation or produce inconsistent behavior | Document action/RPC inputs, outputs, errors, authorization, pagination and invalidation |
| P1 | Test coverage is weighted toward CI/security gates, not browser flows | A green build does not prove a usable workflow | Playwright E2E and desktop/mobile smoke flows, accessibility checks and screenshots |
| P2 | Reporting/export feedback and discoverability can improve | Users need confidence about filters, totals and exported range | Clear period controls, scoped summaries, CSV encoding and export success/failure UX |
| P2 | Operational support is not a visible product capability | Configuration or provider failures are hard to diagnose | Safe correlation IDs, structured server logs and deployment/runbook checks; never log secrets or OTPs |

Priorities describe the proposed delivery order, not a claim that all listed issues are proven defects. Every change affecting business rules must be checked against the canonical PDF first.

## 4. Architecture guardrails for the roadmap

1. Keep the existing modular-monolith approach: Next.js App Router + server-only data access + Supabase/PostgreSQL.
2. Use **Server Actions for browser-originated mutations** and scoped Supabase queries/RPCs for reads where appropriate. Use Route Handlers only when there is a concrete need for a stable HTTP API consumed by an external client, webhook, or integration.
3. For each use case, define one authoritative data contract: inputs, validation, output shape, safe error code, authorization rule, and revalidation behavior. Avoid duplicate business logic between UI, Server Actions, and SQL RPCs.
4. RLS remains the final data boundary. Never rely on hidden buttons, route middleware, or client-supplied role/owner IDs as authorization.
5. Keep `SUPABASE_SECRET_KEY` server-only. Normal user data access should use the authenticated user's JWT and RLS; admin client use must remain narrow and explicitly justified.
6. Use database-side search/filter/order/limit/count for growing lists. Ensure pagination has a stable sort key and cannot bypass RLS.
7. Keep migrations additive and reviewed; test clean `supabase db reset`, schema, RLS, Auth integration, and route smoke on the exact PR head.
8. Do not invent insurance contract, premium/payment, claims, CRM, AI, or other out-of-scope modules. Treat them as separate product decisions, not implied UI improvements.

## 5. Proposed implementation phases

### Phase 0 — Audit baseline and requirements lock (this document)

**Goal:** establish what exists, what is missing, and the evidence for each next change.

- Record branch/base SHA, existing routes/actions/RPCs/migrations/tests and CI.
- Verify each candidate enhancement against the canonical PDF and current decision log.
- Create a role × module × action authorization matrix.
- Capture baseline screenshots and critical user-flow recordings before changing page layouts.

**Acceptance:** every planned change has an existing source requirement or an approved decision; current CI status and known deployment deviations are documented.

### Phase 1 — Authenticated application shell and design system

**Goal:** make the system feel like one coherent application.

- Add shared authenticated layout with responsive sidebar/drawer, topbar, breadcrumbs, active navigation, user/account menu and logout.
- Navigation is role-aware for Admin, DM, UM, and SA; server-side guards remain authoritative.
- Standardize page title/description/action slots, cards, tables, form fields, badges, alerts, confirm dialogs and pagination.
- Apply keyboard navigation, visible focus, semantic landmarks, accessible names, reduced motion, and mobile layout.
- Keep the public landing page separate from the authenticated workspace.

**Acceptance:** all existing routes render inside the correct shell; mobile navigation works by keyboard and touch; no route becomes accessible merely because a link is hidden.

### Phase 2 — Shared data interaction and error contract

**Goal:** remove “dead-end form” behavior and inconsistent feedback.

- Standardize server-side input parsing/validation and safe error codes for each Server Action.
- Add consistent pending/disabled states, field-level validation, success confirmation, safe failure message, empty state, retry action, and not-found/access-denied states.
- Define cache/revalidation rules after each mutation so lists, detail views, dashboard and reports stay consistent.
- Add confirm dialogs for destructive operations and prevent accidental duplicate submissions where applicable.

**Acceptance:** every form has explicit invalid/success/failure behavior; internal provider/database errors are not rendered to users; repeated submission does not create duplicate mutations.

### Phase 3 — Customer management workflow + scalable query contract

**Goal:** turn customer pages into an efficient daily workflow without changing ownership rules.

- Move search, type/status/group filters, sorting, pagination and total count to database-side queries/RPCs.
- Preserve URL query parameters so filtered views can be bookmarked/shared within the authorized scope.
- Improve list readability, mobile table/card presentation, create/edit/detail forms, validation, delete confirmation and post-save feedback.
- Add tests for owner-only access, invalid filters, pagination boundaries, empty result, and direct URL access.
- Review any account-name joins and ensure no customer data can be read outside the current user's ownership.

**Acceptance:** the list does not fetch all rows merely to filter in memory; results/counts remain scoped by RLS; CRUD happy paths and deny paths pass integration and browser tests.

### Phase 4 — Business activity workflow

**Goal:** make activity entry and history useful for SA and authorized managers.

- Improve create/edit/detail flows and history presentation, with clear activity type, date/time, location and connected-customer count.
- Provide permitted manager views of subordinate activity using an explicit scoped query/RPC.
- Replace broad account lookups with a least-privilege display contract.
- Add filtering, deterministic ordering, empty states and validation; do not add new activity types unless source-backed.

**Acceptance:** SA can only mutate their own activities; DM/UM can view only the hierarchy permitted by the business rule; out-of-scope records are denied in RLS/RPC tests.

### Phase 5 — Personnel hierarchy and role-specific dashboard

**Goal:** make the management structure understandable and actionable.

- Present the DM → UM → SA hierarchy as a readable tree/list with role, account state and permitted summary metrics.
- Add detail views that only expose fields authorized by the current role.
- Replace the link-only dashboard with role-scoped KPIs and recent activity/customer summaries from existing data.
- Show only actions the role can perform; enforce the same permission at server/database layer.

**Acceptance:** dashboard values reconcile with the authoritative scoped queries; SA cannot enumerate other personnel; manager views do not expand beyond their hierarchy.

### Phase 6 — Notifications workflow

**Goal:** make create → send → read status obvious and reliable.

- Improve DM recipient selection within scope, draft/sent status, sent confirmation and per-recipient read state.
- Add clear empty/loading/error states and prevent invalid recipient combinations.
- Document the existing create/send/read RPC/action contract and failure cases.
- Do not implement update/delete until the canonical rule is confirmed or a decision-log entry approves it.

**Acceptance:** DM cannot target users outside their scope; send is only reported as successful after the RPC succeeds; read state is scoped to the current recipient; tests cover unauthorized recipient IDs.

### Phase 7 — Reports and export UX

**Goal:** make metrics understandable and exports trustworthy.

- Improve day/week/month selection, date-anchor validation, summary cards, personal/team/overview grouping and labels.
- Display the effective range and timezone consistently (`Asia/Ho_Chi_Minh`).
- Keep on-screen totals and export based on the same scoped aggregate contract.
- Handle empty ranges and export errors explicitly; test UTF-8 CSV and spreadsheet-friendly output.

**Acceptance:** report range and timezone are visible; export respects the same role scope and filters; exported totals reconcile with the displayed report.

### Phase 8 — Admin account and RBAC workflows

**Goal:** make privileged operations safer and less error-prone.

- Improve account list/detail, pending approval, lock/unlock and role assignment feedback.
- Display role/permission catalog clearly and distinguish role assignment from permission catalog management.
- Add confirmation and clear before/after feedback for sensitive changes.
- Do not implement arbitrary per-user permission grants or advanced role CRUD unless the canonical requirement demands it.
- Test that non-admin users cannot call Admin actions/RPCs directly.

**Acceptance:** each privileged operation is checked server-side and in the database; unauthorized direct action/RPC calls are denied; the UI reflects the persisted state after mutation.

### Phase 9 — API contract, security regression and browser E2E

**Goal:** make the system maintainable and releaseable as modules evolve.

- Publish a lightweight contract catalogue for Server Actions/RPCs: purpose, input/output, validation, permission/scope, error codes, and cache invalidation.
- Add Playwright critical journeys: login/logout, registration/approval path, OTP recovery/change, customer CRUD, activity creation, notification send/read, reports/export, and Admin authorization.
- Run desktop/mobile viewport checks, keyboard-only flows, accessible-name checks and screenshot comparisons.
- Keep clean database reset + migration, RLS, Auth integration, secret-boundary, lint/type-check/build and route smoke gates on PR head.
- Add safe server-side diagnostics only where they help; never log passwords, OTPs, session tokens, or secret keys.

**Acceptance:** all P0 journeys pass against a clean local Supabase environment; all role deny-path tests pass; screenshots are reviewed at desktop and mobile widths; no secrets or private data appear in logs.

### Phase 10 — Release readiness and product backlog

**Goal:** distinguish demo-ready from public-production-ready.

- Run production smoke against the actual Vercel/Supabase project, including real OTP delivery and migration/catalog verification.
- Document hosted-plan limitations and operational runbooks; do not claim a provider capability that is not enabled.
- Review unresolved business rules and close only with evidence.
- Put new capabilities (for example audit history, richer notification controls, imports, or integrations) into a separately approved backlog after canonical-source review.

**Acceptance:** production release has reproducible evidence, owner-approved known deviations, current deployment documentation, and no open P0 defects.

## 6. Definition of Done for every phase

- Requirement/source reference or approved decision-log entry exists.
- Data contract and authorization scope are documented before UI implementation.
- Migration is additive and reversible where practical; schema changes have clean-reset tests.
- Server/database authorization is tested for both allowed and denied access.
- UI has loading, empty, success, validation, error, not-found and access-denied behavior as relevant.
- Responsive, keyboard, semantic/accessibility and browser smoke checks are completed.
- Lint, TypeScript, security-boundary, build, relevant database/Auth tests and route smoke pass on the exact head commit.
- PR description states business impact, affected use cases, test evidence, migration/deployment steps, and known deviations.
- No phase is marked complete based on mock data, visual appearance, or a successful build alone.

## 7. Suggested delivery order

1. Phase 1 — authenticated shell/design system.
2. Phase 2 — shared interaction/error contract.
3. Phase 3 — customer query + UX.
4. Phase 4 — activity workflow.
5. Phase 5 — personnel + dashboard.
6. Phase 6 — notifications.
7. Phase 7 — reports/export.
8. Phase 8 — Admin/RBAC.
9. Phase 9 — E2E/security regression.
10. Phase 10 — release readiness.

Phase 0 is the audit baseline and should be completed before Phase 1. Work can be split into small feature branches/PRs; do not combine all phases into one large implementation PR.

## 8. Risks and unresolved checks

- **Canonical PDF:** contents were not independently reviewed during this audit. Do not change business rules until its relevant section/page is verified.
- **Browser baseline:** no before/after browser screenshots were captured during this audit.
- **Production state:** CI success and Vercel status do not prove live OTP delivery, production migration state, or production smoke acceptance.
- **Query scope:** inspect every broad read and manager hierarchy query before expanding UI visibility.
- **Business scope:** core MVP modules already exist. The main immediate gap is cohesive UX, scalable query behavior, clear contracts and workflow verification—not indiscriminately adding unrelated features.
