# IDAILY — Server Action and UI Feedback Contract (Phase 2)

## Purpose

This document records the existing Server Action conventions and the first shared UI primitives. It is not a new HTTP API specification. Business rules and authorization continue to come from the canonical project specification, server guards, RPCs and RLS.

## Contract conventions

- Browser-originated mutations remain Next.js Server Actions.
- Inputs are read from `FormData`, normalized/validated on the server, and rejected before mutation when invalid.
- Authorization is performed by existing server guards (for example `requireBusinessAccount`, `requireDm`) and database RLS/RPC authorization. Client-side visibility is not an authorization boundary.
- Existing actions communicate outcome with a redirect to the affected route and a stable `error` or `status` query code.
- User-visible messages must not expose Supabase/Postgres/provider error text, SQL, tokens, or secrets.
- Successful feedback is emitted only after the awaited mutation/RPC returns success. For row mutations, a selected row/result is checked where the existing action already requires it.
- Forms should disable their submit control while the Server Action is pending to reduce accidental repeat submissions. This is a UX safeguard, not a substitute for server/database idempotency or uniqueness constraints.
- Read operations keep using the authenticated user's Supabase client and RLS. No new Route Handler, service-role access, RPC or schema is introduced by these primitives.

## Existing action inventory (initial coverage)

| Action group | Input | Authorization | Success response | Safe failure codes |
|---|---|---|---|---|
| Customer create | Customer fields from FormData | `requireBusinessAccount`; owner ID comes from authenticated context | Redirect to created detail with `status=created` | `invalid`, `create` |
| Customer update | `customer_id` + customer fields | `requireBusinessAccount` + RLS ownership | Detail with `status=updated` | `invalid`, `update` |
| Customer delete | `customer_id` | `requireBusinessAccount` + RLS ownership | List with `status=deleted` | `delete` |
| Activity create | Activity type/location/time/connected count | `requireBusinessAccount`; owner ID from authenticated context | List with `status=created` | `invalid`, `create` |
| Activity update/delete | `activity_id` + fields where applicable | `requireBusinessAccount`, explicit owner predicate, and RLS | List with `status=updated` or `deleted` | `invalid`, `update`, `delete` |
| Notification create | Title/content/type/recipient IDs | `requireDm` + scoped `dm_create_notification` RPC | List with `status=created` | `invalid`, `create` |
| Notification send | `notification_id` | `requireDm` + `dm_send_notification` RPC | List with `status=sent` | `send` |
| Mark notification read | `recipient_row_id` | Authenticated account ID predicate + RLS | List with `status=read` | `read` |
| Password/auth flows | Email/password/OTP fields as relevant | Supabase Auth + existing active-account/session gates | Redirect after Auth operation succeeds | Existing safe codes in `src/app/auth/actions.ts` |

This inventory is a first pass over the inspected actions, not a claim that every Server Action in the repository has been catalogued.

## Shared UI primitives added in this phase

- `ActionFeedback`: maps known safe `error` and `status` codes to Vietnamese copy, with a generic fallback for unknown codes. Errors use `role=alert`; success uses `role=status`.
- `PendingSubmitButton`: uses React's `useFormStatus` to disable the submit control and change its label while the containing form is pending.

## Remaining work / acceptance

- Adopt shared feedback and pending controls incrementally across existing mutation forms.
- Add focused tests for error-code mapping, fallback behavior, and pending button semantics where the repository's test harness supports component tests.
- Review date/time, numeric and enum validation against existing database constraints before broad refactoring.
- Review mutation duplicate behavior per operation; do not claim exactly-once behavior from disabled buttons.
- Run lint, TypeScript, secret-boundary check, production build, database/Auth tests, and browser smoke on the exact PR head before merge.
