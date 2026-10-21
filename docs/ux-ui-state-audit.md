# UX/UI state audit — Phase 2

## Baseline and scope

- Repository: quangson2809/BTL-opensource
- Verified base: updateUx/ui at 70d5845c696e428a48a78db6ce000df23b0c0ba4.
- Phase 1 was not merged into that branch. This phase starts from feature/phase-1-form-resilience at 42bfce9eed5dbcbce00661d874d34265fa37408a, preserving form-draft protection, sensitive-field exclusions and the duplicate-submit guard.
- Stack/scripts read from package.json: Next.js 16.3.6, React 19.3.0, TypeScript 6.0.3; lint, type-check, test:contracts, security-check and build scripts exist.
- The GitHub source reader is available, but the execution shell cannot resolve github.com. Local npm/browser/E2E execution was not performed at authoring time. This source audit is not runtime proof.

## Findings verified before changes

1. Root src/app/loading.tsx, src/app/not-found.tsx and src/app/global-error.tsx were absent.
2. src/app/error.tsx reused ErrorState and reset for recovery, but claimed that technical details were retained in logs without evidence.
3. src/components/app-frame.tsx called auth.getUser() and account/role queries without try/catch/finally. A rejected promise could remain unhandled and leave the account summary loading. Role RPC errors were ignored rather than surfaced, although role navigation happened to fail closed because only data === true added a role.
4. Dashboard recent activity used one-off empty markup. Personnel tree and role catalogue could render an empty container after successful empty responses.
5. Customer, activity, notification and admin-account list queries checked query errors before the shared empty state. Filtered no-results copy is distinct from the unfiltered empty message; ResultSummary provides clear-filter recovery.
6. Detail pages already use notFound() for missing records and throw separately on query failures. requireAdmin/requireManager redirect on authorization lookup failure, preserving fail-closed behavior.

## Route × state × recovery matrix

Legend: Implemented means source-reviewed or changed; it does not claim browser/runtime behavior was executed. N/A means the state does not apply. Error retry uses route boundary reset; it does not replay mutations.

| Route / feature | Initial loading | Empty / no results | Error | Forbidden / not found | Success feedback | Retry / recovery | Evidence / status |
|---|---|---|---|---|---|---|---|
| / landing | Root LoadingState added | N/A — static page | Root error/fatal fallback | N/A | N/A | Error reset or home route | Source reviewed; runtime NOT RUN |
| /login | Root loading | N/A | Allowlisted auth feedback / boundary | Existing auth flow retained | Existing mapped status | Guarded form can retry after action resolves | Phase 1 tests retained; runtime NOT RUN |
| /register | Root loading | N/A | Existing registration feedback / boundary | Existing auth flow retained | Existing mapped status | Guarded submit and configured safe draft | Phase 1 tests retained; runtime NOT RUN |
| /auth/callback | N/A — route handler | N/A | Existing callback result handling | Existing auth callback contract unchanged | N/A | Follow redirect result | Source reviewed; runtime NOT RUN |
| /dashboard | Root loading | Shared empty state for recent activity; KPI zero values retained | Query errors throw before render | Existing business/account guard | N/A — read-only | Reset retries read route | Contract test added; runtime NOT RUN |
| /customers | Root loading | Empty and filtered no-results differ; clear filter retained | Count/list errors throw before empty state | Existing account guard/RLS behavior | Existing ActionFeedback | Reset retries read request | Contract test added; runtime NOT RUN |
| /customers/new | Root loading | N/A — form | Existing action feedback / boundary | Existing account guard | Server-confirmed status redirect | Guarded submit and Phase 1 draft recovery | Phase 1 tests retained; runtime NOT RUN |
| /customers/[id] | Root loading | N/A — detail | Query failure distinct from missing row | Existing notFound() | Existing action feedback | Reset retries read only | Source reviewed; runtime NOT RUN |
| /customers/[id]/edit | Root loading | N/A — form | Query failure distinct from missing row | Existing notFound() | Server-confirmed redirect state | Guarded submit and draft recovery | Phase 1 tests retained; runtime NOT RUN |
| /activities | Root loading | Empty/no-results plus clear filters | Count/list/account query failures throw | Existing account scope | Existing action feedback | Reset retries read route; no mutation retry | Contract test added; runtime NOT RUN |
| /activities/new | Root loading | N/A — form | Existing action feedback | Existing account guard | Server-confirmed status redirect | Guarded submit and draft persistence | Phase 1 tests retained; runtime NOT RUN |
| /activities/[id]/edit | Root loading | N/A — form | Query error separate from not-found | Existing notFound() | Server-confirmed redirect state | Retry reads only | Source reviewed; runtime NOT RUN |
| /notifications | Root loading | Existing empty/no-results + DM-aware CTA/clear filter | Role/count/list/recipient failures throw | Existing notification scope | Existing action feedback for send/read/delete | Retry read route only; no mutation retry | Contract test added; runtime NOT RUN |
| /notifications/new | Root loading | N/A — form | Recipient query / action feedback | Existing DM guard | Server-confirmed status redirect | Guarded submit and draft persistence | Phase 1 tests retained; runtime NOT RUN |
| /notifications/[id]/edit | Root loading | N/A — edit form | Related query failures distinct | Current notFound behavior retained | Server-confirmed status redirect | Reset retries reads only | Source reviewed; runtime NOT RUN |
| /personnel | Root loading | New shared empty state for empty tree | Query failures throw | requireManager remains fail-closed | N/A — read-only | Reset retries read route | Contract test added; runtime NOT RUN |
| /personnel/[id] | Root loading | N/A — detail | Account/summary query errors throw | Missing account notFound(); manager gate retained | N/A — read-only | Reset retries read route | Source reviewed; runtime NOT RUN |
| /reports | Root loading | New empty-state message for empty leaderboard; metric zeros retained | RPC failure throws | Existing scoped RPC and account checks | N/A — read-only | Reset retries read route | Contract test added; runtime NOT RUN |
| /reports/export | Root loading boundary shared | N/A — export handler | Existing HTTP response contract unchanged | Existing server-side scope retained | Download response only on success | Re-request export subject to existing contract | Source reviewed; runtime NOT RUN |
| /admin/accounts | Root loading | Existing empty/no-results + clear filter | Count/list failures throw before empty state | requireAdmin unchanged | Existing action feedback | Reset retries read route | Contract test added; runtime NOT RUN |
| /admin/accounts/[id] | Root loading | N/A — detail/admin form | Account/assignment/role failures throw | Missing account notFound(); admin gate retained | Existing explicit feedback | Retry reads only; mutations guarded | Source reviewed; runtime NOT RUN |
| /admin/roles | Root loading | New shared empty state for role catalogue; empty permissions already explained | Role/permission/mapping errors throw | requireAdmin unchanged | Existing status map | Reset retries read route | Contract test added; runtime NOT RUN |
| /admin/roles/new | Root loading | Existing no-permissions explanation | Permission query failure throws | Existing admin gate | Existing mapped action feedback | Guarded submit and draft persistence | Source reviewed; runtime NOT RUN |
| /admin/roles/[id]/edit | Root loading | Existing no-permissions explanation | Related queries fail separately from missing role | notFound() retained; admin gate unchanged | Existing mapped action feedback | Guarded submit and draft persistence | Source reviewed; runtime NOT RUN |
| /password/change | Root loading | N/A — form | Existing mapped auth/action feedback | Existing auth flow unchanged | Existing server-confirmed feedback | Guarded submit and retry after returned error | Source reviewed; runtime NOT RUN |
| /password/recovery | Root loading | N/A — form | Existing mapped feedback | Existing auth flow unchanged | Existing status feedback | Guarded submit and safe draft persistence | Phase 1 tests retained; runtime NOT RUN |
| /password/recovery/verify | Root loading | N/A — form | Existing mapped OTP/action feedback | Existing OTP/auth contract unchanged | Server-confirmed status | Guarded submit; OTP/password remain excluded from drafts | Phase 1 tests retained; runtime NOT RUN |
| /access-denied | Root loading | N/A | Explicit forbidden page | Existing forbidden destination retained | N/A | Logout is the existing recovery action | Source reviewed; runtime NOT RUN |
| Unknown route / unavailable record | N/A | Localized not-found fallback | Not conflated with server error | Root not-found and existing detail notFound() | N/A | Link to landing page | New fallback; runtime NOT RUN |
| Shared shell account/role context | Local account-loading status | N/A | Rejected requests caught; generic safe error displayed | Role-query failure clears role set (fail closed) | N/A | Explicit retry; stale async results ignored after cleanup | Contract test added; runtime NOT RUN |

## Acceptance checks at authoring time

| AC | Evidence | Status |
|---|---|---|
| AC-01 first load | Root boundary wired to shared LoadingState | NOT RUN — browser unavailable |
| AC-02 no infinite loading | Account context catch/finally and route boundary reset | NOT RUN — runtime failure not executed |
| AC-03 Empty only after query success | List pages reviewed; query errors checked first | Source-reviewed; runtime NOT RUN |
| AC-04 no-results recovery | Filtered copy and clear-filter link retained | Source-reviewed; browser NOT RUN |
| AC-05 safe error/recovery | Error reset plus shell retry | Source-reviewed; runtime NOT RUN |
| AC-06 no duplicate write retry | No new mutation retry; Phase 1 GuardedForm retained | Existing tests retained; execution NOT RUN |
| AC-07 forbidden vs not-found | Existing fail-closed guards/notFound() retained; localized not-found added | Source-reviewed; role/browser tests NOT RUN |
| AC-08 server-confirmed success | Existing action redirects use allowlisted feedback codes | Source-reviewed; action tests NOT RUN |
| AC-09 Phase 1 regression | Draft exclusions and synchronous submit lock unchanged | Existing tests retained; execution NOT RUN |
| AC-10 stale shell response | Effect cleanup guard and retry attempt counter | Source-reviewed; race test NOT RUN |
| AC-11 internal details hidden | Generic fallback copy; exception values not rendered | Source-reviewed; runtime test NOT RUN |
| AC-12 route inventory | Route source tree checked and listed above | Documentation complete |
| AC-13 authorization unchanged | No policy/API/schema/auth flow change intended | Verify final diff |
| AC-14 lint/type-check/tests/build | Scripts verified in package.json; no local network for npm | BLOCKED locally; CI verification required |

## Phase 2 change list

- Add root loading, localized not-found, and fatal error boundaries using existing shared state components.
- Replace unsupported log-persistence claim with accurate recovery copy.
- Make shell account/role lookup failures terminate loading, expose safe retry, keep role navigation fail-closed and ignore stale completions.
- Reuse EmptyState for dashboard recent activity and add empty explanations for empty personnel trees, report leaderboard and role catalogue.
- Add source-contract tests. Phase 1 source and tests are left unchanged.
