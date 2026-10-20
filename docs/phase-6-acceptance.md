# Phase 6 — Acceptance Checklist

**Branch:** `feature/phase-6-design-system`  
**PR:** [#32](https://github.com/quangson2809/BTL-opensource/pull/32)  
**Latest implementation branch:** `feature/phase-6-design-system`  
**Acceptance state:** **CI verification is tied to the latest PR head; visual acceptance remains open. Do not mark the entire phase PASS yet.**

## 1. CI and test evidence

- [x] Historical GitHub Actions CI and Database Tests passed together on code commit `2306a096`: [CI run](https://github.com/quangson2809/BTL-opensource/actions/runs/39411914717), [Database Tests run](https://github.com/quangson2809/BTL-opensource/actions/runs/39411914816).
- [x] Independent verification of the UI/state-contract source: `npm ci`, `npm run lint`, `npm run type-check`, `npm run test:contracts` (84/84), `npm run security-check`, and `npm run build` passed locally with Next.js `16.4.2`.
- [x] Stabilized the browser focus check so it waits for the hydrated login form before sending Tab; this addresses the observed BODY-focused timing failure in the browser-resilience workflow.
- **Final-SHA gate:** use the live [PR #32 checks](https://github.com/quangson2809/BTL-opensource/pull/32) and verify both workflows report success for the same current head SHA. Historical green runs are not evidence for a later commit.

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

The screenshots below were captured with Playwright from the **local production build** at the recorded source SHAs; they are not AI-generated. They cover the public login form only. Placeholder public Supabase configuration was used to allow the app shell to render; these images are not evidence of live authentication or backend behavior.

### Baseline — commit `1aeb11802438c53583a587b9fb25c7d62daa6223`

- [Before — 1440 × 900](https://d2ol7oe51mr4n9.cloudfront.net/user_3JdfKvR07KrtCXkHeuZWp7KcS8e/5f7aa738-506e-40f4-a7cf-39cbbee92ae5.jpg)
- [Before — 375 × 812](https://d2ol7oe51mr4n9.cloudfront.net/user_3JdfKvR07KrtCXkHeuZWp7KcS8e/ac3e9132-f9b0-46c1-8bff-7fbfdf74990c.jpg)

### Updated — commit `2306a096da0b1cbb04934a08bd6e224fce461c30`

- [After — 1440 × 900](https://d2ol7oe51mr4n9.cloudfront.net/user_3JdfKvR07KrtCXkHeuZWp7KcS8e/7b910605-e499-40e5-b5c1-854c38ac49fd.jpg)
- [After — 375 × 812](https://d2ol7oe51mr4n9.cloudfront.net/user_3JdfKvR07KrtCXkHeuZWp7KcS8e/3a9804d7-c8fe-425e-a408-8b4e4ba6d3ab.jpg)

- [ ] Capture and inspect authenticated dashboard, customer list, customer detail, customer form and reports at both 1440 × 900 and 375 × 812 using a valid test account/session.
- [ ] Capture loading/error/empty state examples from real application state, not hand-built approximations.
- [ ] Complete keyboard-only and screen-reader smoke testing in a real browser.

**Why these items remain open:** the Vercel preview deployment is marked READY, but the available preview URL is SSO-protected in this session and redirected the capture browser to Vercel login. The independent sandbox has no Docker runtime to start a local Supabase instance or mint a legitimate authenticated test session. The repository's CI browser test passed, but does not produce visual evidence for authenticated workspace routes. These limitations are recorded rather than treated as PASS.

## 5. Security/dependency follow-up

- [x] Upgraded the direct runtime `next` dependency and `eslint-config-next` to `16.4.2`, regenerated `package-lock.json`, and ran `npm audit fix` without `--force`.
- [x] `npm audit --omit=dev` now reports **0 High, 0 Critical, 0 total** vulnerabilities in the production dependency graph.
- [ ] Full `npm audit` still reports **5 High, 0 Critical**, isolated to the development ESLint chain `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`. The [official advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) currently lists **no patched version** of `braces`. Do not invent an override for a nonexistent fixed release or use `npm audit fix --force`: npm proposes downgrading `eslint-config-next` to `14.2.35`, incompatible with this Next 16 application. Reassess the development-only advisory when upstream publishes a fix; this remains an explicitly open risk.

## Final acceptance rule

Phase 6 is **not fully accepted** until the final SHA has green CI, the authenticated responsive screenshots and manual accessibility review are completed, and the open dependency-security findings are either fixed or formally accepted as a documented risk.
