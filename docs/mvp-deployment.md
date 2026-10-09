# IDAILY MVP — Production deployment runbook

This runbook is the Phase 9 deployment gate. It does not claim production is live until every required step below is verified against the actual production environment.

## 1. Preconditions

Before production deployment:

- the release PR has independent review PASS;
- GitHub CI is green;
- database/RLS tests and Auth integration tests are green from a clean `supabase db reset`;
- the production hosted Supabase project is provisioned;
- the Vercel project is linked to `quangson2809/BTL-opensource`;
- production secrets exist only in the deployment platform, never in Git.

## 2. Supabase production contract

The MVP depends on behavior that must exist in production, not only in local Supabase CLI.

Required application environment values:

```env
NEXT_PUBLIC_SUPABASE_URL=<production URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<production publishable key>
SUPABASE_SECRET_KEY=<server-only production secret key>
```

Never expose `SUPABASE_SECRET_KEY` as a `NEXT_PUBLIC_*` value.

### Database

The production-required role/permission catalog is migration-owned. `supabase/seed.sql` is intentionally a no-op, so a production database does not depend on a deployment runner executing seed hooks.

For the hosted project, prefer the connected Supabase project tooling used by the deployment operator. If the CLI is used instead, link the exact project and review the migration plan before apply:

```bash
supabase link --project-ref <production-project-ref>
supabase db push --dry-run
supabase db push
```

Never put the database password or service key in source control or deployment logs.

The migration set must include:

- core schema/RLS;
- Phase 2 Auth/session gates;
- unconditional password reauthentication compatibility shim;
- Phase 3 Admin/RBAC RPCs;
- Phase 4-6 customer/personnel/activity/notification boundary;
- Phase 7 reporting aggregate RPC;
- production-required `ADMIN`/`DM`/`UM`/`SA` role catalog, `ACTIVITY_VIEW_SUBTREE`, DM/UM permission mappings, and customer-created-at integrity protection.

Before Admin bootstrap or opening traffic, verify the migrated catalog directly against the production database:

```bash
psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select ma_vai_tro
from public.vai_tro
where ma_vai_tro in ('ADMIN', 'DM', 'UM', 'SA')
order by ma_vai_tro;

select vt.ma_vai_tro, q.ma_quyen
from public.phan_quyen_vai_tro pqvt
join public.vai_tro vt on vt.id = pqvt.vai_tro_id
join public.quyen q on q.id = pqvt.quyen_id
where vt.ma_vai_tro in ('DM', 'UM')
  and q.ma_quyen = 'ACTIVITY_VIEW_SUBTREE'
order by vt.ma_vai_tro;
SQL
```

Expected result: four required roles and exactly the DM/UM `ACTIVITY_VIEW_SUBTREE` mappings. If any are missing, stop deployment rather than bootstrapping users against a partial catalog.

### Hosted Free Auth exception

The original Phase 2 design contains a Password Verification Hook for the exact "6 consecutive failures -> 30 minute temporary lock" invariant. Local/CI keeps this hook enabled and regression-tested.

MVP production uses hosted Supabase Free. Supabase's current Auth Hooks documentation lists **Password Verification Attempt Hook as Teams/Enterprise only**, so the Free production project cannot enforce that exact per-account threshold at the provider boundary.

Production MVP therefore:

- does **not** claim exact 6/30 enforcement;
- does not move failed-attempt bookkeeping into Next.js/server actions, because direct public Auth API calls could bypass such a counter;
- relies on Supabase Auth password policy and provider-managed rate limiting/abuse protection;
- keeps the existing lock columns/hook function as forward-compatible schema for a future supported plan/self-hosted deployment;
- treats exact 6/30 as a documented known MVP deviation if the canonical PDF requires it.

Leaked-password protection is also not an MVP acceptance requirement on the Free plan. A Security Advisor warning for that feature is documented rather than misreported as enabled.

### SMTP / OTP

For a classroom/demo deployment with no paid email service, Supabase's default SMTP may be used **only with pre-authorized project-team email addresses**. It is not suitable for unrestricted/public production email delivery.

The demo acceptance path must preserve:

- password minimum 8;
- lowercase + uppercase + digit;
- secure password change enabled;
- reauthentication and recovery email flows actually working for the chosen demo account.

Local/CI remains the source of truth for the configured 8-digit / 600-second OTP contract. Hosted settings must be checked where the plan/dashboard exposes them. If the hosted project cannot send reauthentication/recovery email to the selected demo account, stop acceptance and configure a no-cost custom SMTP provider or use another pre-authorized team address.

### Hosted Auth compatibility verification

The current unconditional password-reauthentication compatibility shim backdates `auth.sessions.created_at` for password sessions.

For hosted Supabase, the Auth runtime is managed by Supabase and an immutable self-hosted GoTrue image/digest is not an MVP acceptance requirement. Instead:

1. verify reauthentication OTP end-to-end on the actual hosted project;
2. verify recovery OTP end-to-end on the actual hosted project;
3. keep session time-boxing disabled while the shim depends on `auth.sessions.created_at`;
4. do not enable low-AAL/session-lifetime behavior that interprets the backdated timestamp as real session age;
5. record the hosted project ref, plan, acceptance date and observed behavior.

CI remains pinned to Supabase CLI `2.119.0`; its local GoTrue version is only a regression-test baseline, not a production-version claim.

## 3. Vercel project

Create or link a Vercel project to:

`quangson2809/BTL-opensource`

Production branch:

`main`

Configure the three application variables above for both Preview and Production with environment-appropriate values.

Do not put production secrets in GitHub source, build logs, or client-visible environment names.

## 4. Preview gate

Before promoting to production:

1. deploy the reviewed release commit to Preview;
2. verify build status is READY;
3. run the smoke checklist below against the Preview URL;
4. inspect runtime/build logs for errors;
5. only promote the same tested artifact after smoke PASS.

## 5. MVP smoke checklist

### Public/Auth

- home loads;
- register page loads;
- SA registration creates `CHO_PHE_DUYET` account;
- pending SA cannot access business data;
- Admin approval enables password-authenticated access;
- login/logout works;
- password change requires email reauthentication OTP;
- recovery OTP resets password then forces normal password login;
- hosted Auth rejects invalid credentials and application state gates still block `CHO_PHE_DUYET` / `KHOA` accounts;
- do **not** include exact 6/30 temporary-lock behavior in hosted Free acceptance; it is a documented MVP exception.

### Admin/RBAC

- account list/detail loads for Admin;
- approve/lock/unlock valid transitions work;
- invalid transitions fail;
- assign/revoke role works;
- non-Admin direct Admin RPC attempts fail.

### Customer/Personnel

- owner customer CRUD works;
- cross-owner customer read/update/delete fails;
- customer search/filter works;
- DM/UM personnel subtree renders;
- manager gets aggregate subordinate summary but not raw subordinate customer rows.

### Activity

- own create/update/delete works;
- DM/UM can read subordinate activity in scope;
- manager cannot update/delete subordinate activity;
- unrelated activity is not visible.

### Notification

- DM creates draft only for subtree recipients;
- recipient cannot see draft;
- another DM cannot send the draft;
- owner DM sends once;
- resend fails;
- recipient can read/mark-read after send;
- non-recipient cannot read;
- stale recipient that leaves subtree before send causes send failure.

Notification update/delete remains deferred until the canonical business rule is explicitly locked.

### Reports/export

- day/week/month periods return scoped aggregates;
- SA sees only self;
- DM/UM sees self + subtree, not unrelated accounts;
- personal/team/overview totals render;
- comparison table renders;
- CSV export contains only the same scoped rows and opens correctly in Excel.

## 6. Acceptance evidence

Record:

- reviewed release SHA;
- GitHub CI run IDs;
- database/Auth test run ID and PASS result;
- production migration result;
- hosted Supabase project ref + plan and the documented Auth-plan exception;
- Vercel Preview deployment URL/ID;
- Vercel Production deployment URL/ID;
- smoke-test result;
- any canonical-PDF requirement that remains unverifiable.

Do not mark Phase 9 complete until this evidence exists.
