# Local demo: Admin approval flow

This procedure is for a **local Supabase stack only**. The seed script refuses any API URL whose hostname is not `localhost`, `127.0.0.1` or `::1`. Never use a production URL or production secret.

## 1. Start the local stack

Requirements: Node.js 20.19+, npm, Docker, and Supabase CLI.

```bash
npm ci
supabase start
supabase db reset
supabase status -o env
```

Keep the terminal output private: it includes local credentials. Copy the local API URL and local `service_role` key into the environment for the next command only.

## 2. Create local demo accounts

PowerShell example (replace the local values with the output from `supabase status -o env`):

```powershell
$env:API_URL = "http://127.0.0.1:54321"
$env:SERVICE_ROLE_KEY = "<local-service-role-key>"
$env:DEMO_ADMIN_EMAIL = "admin.local@example.test"
$env:DEMO_ADMIN_PASSWORD = "<choose-a-local-password>"
$env:DEMO_SA_EMAIL = "sa.pending@example.test"
$env:DEMO_SA_PASSWORD = "<choose-another-local-password>"
npm run seed:local-demo
Remove-Item Env:SERVICE_ROLE_KEY
```

Use passwords that satisfy the configured local Auth password policy. The script creates an active local Admin and a pending local SA account. It is idempotent for the same email addresses and updates their local passwords to the values supplied. Do not use real user passwords.

## 3. Verify the approval flow

1. Start the web app with `npm run dev`.
2. Open `http://localhost:3000/login` and sign in with `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD`.
3. Open `/admin/accounts`; confirm the `Local Demo Pending SA` account is listed with status `CHO_PHE_DUYET`.
4. Approve that account using the Admin UI.
5. Sign out and sign in as `DEMO_SA_EMAIL` with `DEMO_SA_PASSWORD`. Confirm the account can access the protected application after approval.
6. Register a new account through the normal registration page and repeat the approval check.

If the Admin page is forbidden or the pending account is absent, stop and inspect local migrations, RLS/Auth integration tests and the browser/server logs. Do not work around authorization by exposing a service-role key to the browser.

## Safety boundary

- `supabase db reset` destroys/recreates the **linked local database only**; confirm the CLI target is local before running it.
- `scripts/seed-local-demo.mjs` has a hostname guard and must not be weakened to allow hosted projects.
- `SERVICE_ROLE_KEY` is used only by this local setup script. Never prefix it with `NEXT_PUBLIC_`, commit it, paste it into issues, or use it for ordinary application requests.
- This script is not a production bootstrap procedure. Production bootstrap remains an explicit operator-controlled process documented in `docs/admin-bootstrap.md`.
