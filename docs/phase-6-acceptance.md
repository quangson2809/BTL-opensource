# Phase 6 — Acceptance Checklist

**Branch:** `feature/phase-6-design-system`  
**PR:** [#32](https://github.com/quangson2809/BTL-opensource/pull/32)  
**Latest implementation branch:** `feature/phase-6-design-system`  
**Acceptance state:** **CI and automated authenticated visual capture PASS on `ef066c1f8ea1321bdb30b2af53784f71f760f073`; manual visual/accessibility review and development-only dependency risk remain open. Do not mark the entire phase PASS yet.**

## 1. CI and test evidence

- [x] Historical GitHub Actions CI and Database Tests passed together on code commit `2306a096`: [CI run](https://github.com/quangson2809/BTL-opensource/actions/runs/39411914717), [Database Tests run](https://github.com/quangson2809/BTL-opensource/actions/runs/39411914816).
- [x] Independent verification of the UI/state-contract source: `npm ci`, `npm run lint`, `npm run type-check`, `npm run test:contracts` (84/84), `npm run security-check`, and `npm run build` passed locally with Next.js `16.4.2`.
- [x] Stabilized the browser focus check so it waits for the hydrated login form before sending Tab; this addresses the observed BODY-focused timing failure in the browser-resilience workflow.
- [x] Final-SHA gate verified on `ef066c1f8ea1321bdb30b2af53784f71f760f073`: [CI](https://github.com/quangson2809/BTL-opensource/actions/runs/39451393481) and [Database Tests](https://github.com/quangson2809/BTL-opensource/actions/runs/39451393238) both succeeded for the same SHA.
- [x] Authenticated browser screenshot job succeeded in Database Tests and uploaded [Phase 6 visual screenshots (24 files, 14-day retention)](https://github.com/quangson2809/BTL-opensource/actions/runs/39451393238/artifacts/12278542645).

## 2. CSS and shared-component audit

- [x] Moved authenticated `.page-header` rules to `workspace.css`; `globals.css` no longer competes for the same component styles.
- [x] Removed the duplicate spinner selector and animation keyframe from `globals.css`; `workspace.css` remains the spinner owner and includes reduced-motion handling.
- [x] Updated token tests to assert semantic-token use instead of requiring repeated colour literals in declarations.
- [x] Added contract checks for PageHeader single ownership, mobile full-width actions, spinner ownership and reduced-motion support.
- [x] Preserved all `card` and structural wrappers. No wrapper/card was removed: CSS appearance alone was not enough evidence to prove that a wrapper had no layout, responsive or accessibility responsibility.
- [x] Kept the existing shared loading, error, and empty primitives and their semantic roles/retry paths; extended route contracts rather than creating duplicate state components.

## 3. Representative route/source review

- [x] **Dashboard:** role/stat queries and recent activity query errors throw to the route error boundary rather than being silently displayed as zero/empty data.
- [x] **List:** customer count and row-query errors are checked before the empty/results UI; filters, result summary and the shared `EmptyState` remain.
- [x] **Detail:** customer query errors are separated from not-found handling; detail sections retain labelled headings and definition-list semantics.
- [x] **Form:** customer form uses `GuardedForm`, `fieldset`/`legend`, labelled required controls and draft persistence.
- [x] **Report:** report RPC failures throw to the error boundary; the page uses the shared `PageHeader`, keeps the export action, responsive table containers, and a meaningful leaderboard empty state.
- [x] **Boundary states:** root `loading.tsx`, `error.tsx`, `global-error.tsx`, and `not-found.tsx` are wired to the shared primitives; retry and screen-reader contracts are tested.
- [ ] Manual visual and accessibility review of authenticated dashboard/list/detail/form/report routes is still outstanding. Code tests do not prove rendered visual quality or a real screen-reader result.

## 4. Actual-browser screenshots

The screenshots below were captured by Playwright from the **local production build**, with a temporary SA account and customer/activity fixtures created in the **ephemeral local Supabase database inside GitHub Actions**. They are real rendered app screenshots, not AI-generated or manually composed. The latest run captured six routes at 1440 × 900 and 375 × 812 (12 route/viewport combinations) and asserted each page heading plus document/body horizontal overflow. The fixture is CI-only and does not use production credentials or production data. The artifact contains 24 files and expires on 2026-11-03.

### Baseline — commit `1aeb11802438c53583a587b9fb25c7d62daa6223`

- [Before — 1440 × 900](https://d2ol7oe51mr4n9.cloudfront.net/user_3JdfKvR07KrtCXkHeuZWp7KcS8e/5f7aa738-506e-40f4-a7cf-39cbbee92ae5.jpg)
- [Before — 375 × 812](https://d2ol7oe51mr4n9.cloudfront.net/user_3JdfKvR07KrtCXkHeuZWp7KcS8e/ac3e9132-f9b0-46c1-8bff-7fbfdf74990c.jpg)

### Updated — commit `2306a096da0b1cbb04934a08bd6e224fce461c30`

- [After — 1440 × 900](https://d2ol7oe51mr4n9.cloudfront.net/user_3JdfKvR07KrtCXkHeuZWp7KcS8e/7b910605-e499-40e5-b5c1-854c38ac49fd.jpg)
- [After — 375 × 812](https://d2ol7oe51mr4n9.cloudfront.net/user_3JdfKvR07KrtCXkHeuZWp7KcS8e/3a9804d7-c8fe-425e-a408-8b4e4ba6d3ab.jpg)

- [x] Capture authenticated dashboard, customer list, customer detail, customer form, reports, and filtered empty list at both viewports using a temporary authenticated SA account. Evidence: [download actual Playwright screenshots](https://github.com/quangson2809/BTL-opensource/actions/runs/39451393238/artifacts/12278542645).
- [x] Assert route heading and document/body horizontal overflow for all 12 route/viewport combinations; CI reported no horizontal overflow at 1440 × 900 or 375 × 812.
- [ ] Inspect all screenshot images visually for spacing, clipping, contrast, hierarchy and card/wrapper behavior. Automated assertions do not prove aesthetic quality.
- [ ] Capture loading and error boundaries from deliberately induced real application states. The empty-list screenshot is backed by an actual filtered query; loading/error screenshot coverage is not yet complete.
- [ ] Complete keyboard-only and screen-reader smoke testing in a real browser. Existing browser tests cover focus and form accessible names, but do not replace a full manual assistive-technology review.

**Remaining limitations:** screenshots are genuine authenticated CI browser captures, but automated checks only validate page headings and horizontal overflow, not full visual correctness or screen-reader output. Do not remove wrappers/cards without evidence about layout, responsive behavior, and accessibility.

## 5. Security/dependency follow-up

- [x] Upgraded the direct runtime `next` dependency and `eslint-config-next` to `16.4.2`, regenerated `package-lock.json`, and ran `npm audit fix` without `--force`.
- [x] `npm audit --omit=dev` now reports **0 High, 0 Critical, 0 total** vulnerabilities in the production dependency graph.
- [ ] Full `npm audit` still reports **5 High, 0 Critical**, isolated to the development ESLint chain `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`. The [official advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) currently lists **no patched version** of `braces`. Do not invent an override for a nonexistent fixed release or use `npm audit fix --force`: npm proposes downgrading `eslint-config-next` to `14.2.35`, incompatible with this Next 16 application. Reassess the development-only advisory when upstream publishes a fix; this remains an explicitly open risk.

## Final acceptance rule

Phase 6 is **not fully accepted** until the final SHA has green CI, the authenticated responsive screenshots and manual accessibility review are completed, and the open dependency-security findings are either fixed or formally accepted as a documented risk.
