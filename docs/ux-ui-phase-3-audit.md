# Phase 3 UX audit — Notifications, accounts, roles and permissions

Base: \`feature/phase-2-ui-states\` at \`b309307c5510e1514af5c7247be0cdf08def8467\`

This audit records implementation scope. Results of CI and integration checks are tracked in the pull request.

| Route/feature | Existing contract observed | Phase 3 changes | State/recovery notes |
|---|---|---|---|
| \`/notifications\` | Status values are \`CHƯA_GỬI\` and \`ĐÃ_GỬI\`; edit/delete/send actions are rendered only for an owned draft. | Lifecycle UI retained; picker added to create/edit forms. | Query errors throw into Phase 2 route error boundary; empty and filtered no-results remain distinct. |
| \`/notifications/new\` | DM-only page; recipients are loaded from \`tai_khoan\` excluding the current account; create delegates to \`dm_create_notification\`. | Searchable multi-select with count, removable selections, empty/no-results states and required-selection validation. | Draft restoration event reconciles checkbox UI state. |
| \`/notifications/[id]/edit\` | DM-only; only an owned \`CHƯA_GỬI\` notification can be edited; updates use \`dm_update_notification_draft\`. | Same picker; save is blocked if current recipients cannot all be matched to the permitted recipient list. | Draft key remains scoped by notification ID and account. |
| \`/admin/accounts\` | Admin-only; observed account states are \`CHO_PHE_DUYET\`, \`DANG_HOAT_DONG\`, \`KHOA\`. | Existing state labels and filtering retained. | Query errors are not represented as an empty list. |
| \`/admin/accounts/[id]\` | Admin-only; state transitions and role changes use existing server actions/RPCs; self-lock and self-admin-revoke protections exist. | Confirmation messages name the account/role and describe state effects; pending state retained. | Server-side RPC authorization remains authoritative. |
| \`/admin/roles/new\` | Admin-only; permission catalog is read-only and role creation uses \`admin_create_role\`. | Searchable permission picker with presentation-only groups based on known key prefixes. | Draft restoration retains checked permissions while search hides options. |
| \`/admin/roles/[id]/edit\` | System roles are protected; permission mappings are read with role data; saving uses \`admin_update_role\`. | Same picker preselected from permission mapping. | Query/RPC errors remain fail-closed; keys and RPC contracts are unchanged. |
| \`/admin/roles\` | Role/permission query failures throw; permission definitions are migration-owned. | Permission catalog is grouped by known prefix. | Unknown permission prefixes use neutral “Quyền khác” group. |

## Root cause and fix for the failed route smoke

The failing workflow expected unauthenticated requests to protected routes to receive an HTTP redirect, but \`src/lib/supabase/proxy.ts\` only awaited \`supabase.auth.getClaims()\` and discarded its result. The server page guards still called \`redirect("/login")\`, but the Next.js route-smoke observed a streamed HTTP 200 for \`/dashboard\`. The same failure was present on the Phase 2 base commit, so it was not introduced by the Phase 3 UI edits.

The fix adds an explicit early redirect in Proxy for protected application route prefixes when verified claims are missing or invalid. Public auth routes remain reachable. \`/reports/export\` is intentionally excluded so its Route Handler keeps returning HTTP 401 for unauthenticated requests. Existing per-page, Server Action, and Route Handler authorization stays in place; Proxy is not treated as the sole security boundary.

A dedicated contract suite covers route prefixes, public routes, path-segment boundaries, consumption of verified claims, and retention of the report-export 401 contract. The results of the CI and Supabase workflows determine final acceptance; the presence of tests alone is not proof that the workflow passes.

## Security and regression constraints

- No migrations, API contracts, permission keys, or authorization RPCs were changed.
- Notification editing, sending and deletion remain gated by server-side authorization and draft status checks.
- If a draft references recipients no longer present in the current permitted list, saving is blocked rather than silently replacing its recipient set.
- Permission grouping is presentation-only and does not change persisted IDs.
- Draft persistence still excludes sensitive controls. The new picker listens for the restoration event to reconcile its controlled state.
- The Proxy is an early navigation guard; server-side authorization remains authoritative.
