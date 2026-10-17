# IDAILY — Application Shell Design Lock

**Status:** Phase 1 implementation baseline  
**Branch:** `feature/phase-1-application-shell`  
**Parent:** `updateUx/ui` (PR #17 remains separate and must not be merged implicitly)

## Shell decisions

- Keep the public landing page and authentication/recovery pages outside the authenticated workspace shell.
- Render the shared shell only for existing workspace route prefixes: `/dashboard`, `/customers`, `/activities`, `/personnel`, `/notifications`, `/reports`, `/admin`, and `/password/change`.
- Use a persistent left sidebar on desktop, a dismissible navigation drawer on mobile, a top bar with breadcrumbs/account actions, and a main content landmark.
- Preserve existing page components and business actions; the shell is a presentation/navigation layer, not a new authorization boundary.
- Keep role checks backed by the existing `has_role` RPC. Navigation visibility is only discoverability/UX; protected pages and RLS remain authoritative.
- Design tokens remain in the existing global palette (forest green, light neutral canvas, white surfaces, yellow focus accent); no external font dependency.
- Accessibility baseline: skip link, named navigation, active link via `aria-current`, keyboard-visible focus, reduced-motion support inherited from global CSS, and an explicitly labelled mobile menu toggle.

## Evidence-based role navigation matrix

The repository's required role catalog is `ADMIN`, `DM`, `UM`, and `SA`. Existing route guards establish manager access for personnel and Admin access for account administration. The matrix below governs **navigation visibility only**, not API/database authorization.

| Navigation item | SA | UM | DM | ADMIN | Evidence / constraint |
|---|---:|---:|---:|---:|---|
| Dashboard | Yes | Yes | Yes | Yes | Existing `/dashboard` requires an eligible business account |
| Customers | Yes | Yes | Yes | Yes | Existing `/customers` uses authenticated account context and ownership RLS |
| Activities | Yes | Yes | Yes | Yes | Existing route relies on scoped RLS; manager subtree read is a database capability |
| Personnel | No | No | Yes | No | Existing `requireManager()` accepts DM or UM; no evidence Admin can use this route |
| Notifications | Yes | Yes | Yes | Yes | Existing authenticated route and recipient/creator RLS; create/send action remains DM-guarded |
| Reports | Yes | Yes | Yes | Yes | Existing `report_scope` RPC must enforce caller scope |
| Admin accounts | No | No | No | Yes | Existing `requireAdmin()` guard |
| Change password | Yes | Yes | Yes | Yes | Existing authenticated password-change workflow |

## Responsive behavior

- Desktop: sidebar width is fixed, main workspace consumes remaining width, content remains fluid up to the existing content max-width.
- Mobile: sidebar becomes an off-canvas drawer; the toggle exposes `aria-expanded`; selecting a route closes the drawer; backdrop closes it.
- Narrow screens: breadcrumbs truncate safely and account actions wrap rather than forcing horizontal page overflow.

## Non-goals for this PR

- No route moves or module rewrites.
- No new business roles, permissions, API/RPCs, database migrations, or RLS changes.
- No dashboard KPI redesign, customer server-side pagination, or module-specific CRUD redesign (later phases).
- No claim of browser QA until a real browser run and screenshots are available.

## Acceptance checks

- Existing public and authentication routes render without the workspace shell.
- Workspace routes share one shell and expose active navigation/breadcrumbs.
- Role-sensitive navigation is driven by the existing role RPCs.
- Existing server-side route guards and RLS remain unchanged.
- CI must pass on the exact PR head; desktop/mobile browser QA remains a separate required check if not available in CI.
