# IDAILY MVP — Production deployment runbook

This runbook is the Phase 9 deployment gate. It does not claim production is live until every required step below is verified against the actual production environment.

## 1. Preconditions

Before production deployment:

- the release PR has independent review PASS;
- GitHub CI is green;
- database/RLS tests and Auth integration tests are green from a clean `supabase db reset`;
- the production Supabase/Auth environment is provisioned;
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

Set the real self-hosted PostgreSQL connection string outside source control:

```bash
export PROD_DB_URL='postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require'
```

Review the exact migration plan, then apply it to that explicit target:

```bash
supabase db push --db-url "$PROD_DB_URL" --dry-run
supabase db push --db-url "$PROD_DB_URL"
```

Do not use a plain `supabase db push` for self-hosted production unless the CLI has been intentionally linked to that exact target.

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

### Auth password-verification hook

The 6 consecutive password failures -> 30 minute temporary lock invariant requires the Password Verification Hook.

Production self-hosted Auth must enable:

```env
GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED=true
GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI=pg-functions://postgres/public/hook_password_verification_attempt
```

Do not claim the 6/30 invariant is production-enforced if this hook is unavailable.

### SMTP / OTP

Production Auth must configure real SMTP while preserving:

- password minimum 8;
- lowercase + uppercase + digit;
- OTP length 8;
- OTP expiry 600 seconds;
- secure password change enabled.

Test both reauthentication OTP and recovery OTP before acceptance.

### GoTrue compatibility pin

The current unconditional password-reauthentication compatibility shim backdates `auth.sessions.created_at` for password sessions.

Before production acceptance:

1. record the exact GoTrue/Auth image version or immutable digest;
2. verify reauthentication behavior against that pinned version;
3. keep session time-boxing disabled while the shim depends on `auth.sessions.created_at`;
4. do not enable low-AAL/session-lifetime behavior that interprets the backdated timestamp as real session age;
5. replace the shim before enabling those features if a future GoTrue version exposes a supported unconditional reauthentication threshold.

CI is pinned to Supabase CLI `2.119.0`. The validated local stack used by this CLI currently pulls GoTrue `v2.197.0`; treat that as the tested development/CI baseline, not as an automatic production pin.

Production must either pin that tested Auth version/digest or explicitly validate a different version before acceptance. Record the exact production version or immutable digest from the real environment.

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
- six consecutive bad password attempts trigger temporary lock;
- locked account with an existing JWT loses business-data access.

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
- pinned GoTrue/Auth version or digest;
- Vercel Preview deployment URL/ID;
- Vercel Production deployment URL/ID;
- smoke-test result;
- any canonical-PDF requirement that remains unverifiable.

Do not mark Phase 9 complete until this evidence exists.
