# Phase 1–2 Acceptance Checklist

## Phase 1 — Shell and Design System

- [x] Account menu is a native keyboard-operable disclosure and keeps “Đổi mật khẩu” available at mobile widths.
- [x] Breadcrumbs use a named navigation landmark, ordered-list semantics, and a current-page marker.
- [x] Skip link targets a focusable main workspace container.
- [x] Mobile drawer exposes expanded/modal state, remains CSS-hidden before hydration when closed, is inert when closed, makes the background content inert while open, traps Tab focus, closes on Escape/backdrop/navigation, restores focus to the toggle, and disables background scroll.
- [x] Shared PageHeader and EmptyState are applied to the customer/activity/notification lists; LoadingState is available as a reusable primitive and ErrorState/retry is wired to the app error boundary.
- [ ] Visual browser screenshots at 375 / 768 / 1024 / 1440 CSS pixels.
- [ ] Manual keyboard and screen-reader smoke on a real browser; do not infer PASS from CSS/CI alone.

## Phase 2 — Interaction and API contracts

- [x] Inventory of Server Actions, report Route Handler, directly invoked RPCs and relevant authorization boundaries is documented in docs/action-contracts.md.
- [x] Unknown feedback codes fail closed to generic copy; unknown status codes do not show success.
- [x] Shared contract tests cover known/unknown feedback, success precedence, pending/disabled presentation, confirmation accept/cancel, UUID shape, calendar dates, date-time parsing and numeric bounds.
- [x] Customer/activity destructive mutations have pending feedback and explicit confirmation; Admin role assignment/revocation and notification send have explicit confirmation.
- [x] Customer date, activity datetime/numeric fields, and UUID mutation inputs receive stricter server-side validation.
- [ ] Browser-based allow/deny tests for every role-sensitive mutation and retry after a real failed request.
- [ ] Confirm the canonical requirement document establishes all maximum text lengths before enforcing product-facing maximums. Current schema uses text without explicit max-length constraints and source-derived limits were not available in the inspected migrations.

## Final PASS rule

Phase 1 and Phase 2 are **not fully PASS** until the unchecked browser QA and authoritative text-length contract decisions are resolved. The CI result must be read from the exact PR head after changes; baseline CI is not evidence for changed code.
