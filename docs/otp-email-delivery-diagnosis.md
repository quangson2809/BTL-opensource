# OTP email delivery: diagnosis and operational recovery

**Diagnosis date:** 2026-10-23  
**Supabase project:** `kulaguukpngkzpwforok`  
**Code branch:** `fix/otp-email-delivery`

## Confirmed runtime evidence

Supabase Auth logs contain three `auth_logs` records with error code `over_email_send_rate_limit` for endpoint `/reauthenticate`:

- Two records during the 2026-10-23 07:16 UTC minute; the first recorded timestamp is 07:16:41 UTC.
- One record at 2026-10-23 07:17:50 UTC.

This proves that Supabase Auth rejected password-change reauthentication email requests because the email-send rate limit was exceeded at those times. It does **not** prove that SMTP credentials are invalid, that every recovery request fails for the same reason, or that any email reached a recipient.

## Which Auth flow is used?

- **Change password while signed in:** `supabase.auth.reauthenticate()`, which asks Supabase Auth to send the reauthentication OTP email.
- **Forgot password:** `supabase.auth.resetPasswordForEmail(email)`, followed by `verifyOtp({ email, token, type: "recovery" })`.
- The observed `/reauthenticate` rate-limit error is not a callback URL error. These two OTP request calls do not pass an `emailRedirectTo` override.
- **Registration email confirmation** is a separate flow. It uses `signUp(..., options.emailRedirectTo)` and `/auth/callback`. The app currently builds this URL from `NEXT_PUBLIC_SITE_URL`, then Vercel deployment host, and finally falls back to localhost. The production value and Supabase redirect allowlist still need an environment-specific check.

## Code changes in this branch

- Classify Auth delivery errors into rate-limited, recipient-not-authorized, redirect-invalid, provider, and generic service categories.
- Display actionable but non-sensitive user messages.
- Emit a structured server-side event containing only flow, category, allowlisted provider code/name, status, and request ID. Do not log recipient email, OTP, tokens, or the raw provider message.
- No automatic resend/retry loop is added. The submit button already disables while its Server Action is pending.
- Unit tests cover classification and assert that sensitive values/raw provider messages are excluded from structured logs.

These code changes improve diagnosis and prevent the original generic message from hiding a known rate-limit response. They cannot raise a hosted Supabase rate limit or repair an unverified SMTP configuration.

## Required hosted checks — manual action by project owner

Do not paste secrets into GitHub, chat, logs, or this report.

1. In the Supabase Dashboard for the project above, inspect **Authentication → Rate Limits** and record the configured email-send limit. Compare it with the intended product traffic and the plan's constraints. Do not raise limits blindly.
2. Inspect **Authentication → SMTP Settings**:
   - If using Supabase's default email service, check the applicable sending restrictions and wait for the current rate-limit window to reset before one controlled test.
   - If the app needs reliable production delivery, configure a verified custom SMTP provider using the Dashboard's secret fields; never commit SMTP credentials.
   - Confirm sender address/domain verification and provider delivery/bounce logs.
3. Inspect **Authentication → URL Configuration**:
   - Set Site URL to the canonical deployed app origin.
   - Allowlist the exact callback URL `https://<deployed-host>/auth/callback` (and a local callback only for local development).
   - The current Vercel environment-variable inventory contains no `NEXT_PUBLIC_SITE_URL` entry for Preview or Production. The code falls back to Vercel's deployment host when available, but set `NEXT_PUBLIC_SITE_URL` explicitly to the canonical app origin to make the intended callback deterministic. The value must be the origin, not a path or a localhost URL for production.
4. After checking the current settings and allowing the rate limit to reset, perform **one** controlled reauthentication test with an authorized test account, then one recovery test if needed. Capture the UTC timestamp and request ID; do not repeatedly click send.
5. Verify whether the provider accepted the message and whether the test mailbox received it. A successful Auth API response alone is not proof of inbox delivery.

## Local config is not hosted evidence

`supabase/config.toml` declares `[auth.rate_limit].email_sent = 30`, `otp_length = 8`, and `otp_expiry = 600`. These are repository/local settings; they do not prove the hosted Dashboard values. The hosted OTP contract (8 digits, 600 seconds) remains unverified until inspected and tested against the hosted project.

## Acceptance status

- Root cause for the observed password-change failures: **PASS — hosted Auth logs prove email-send rate limiting**.
- Code diagnostics and safe logging: **implemented; CI/runtime verification pending**.
- SMTP/provider configuration: **UNVERIFIED**.
- Recovery-flow delivery: **UNVERIFIED**.
- Actual email accepted by provider / received in mailbox: **NOT YET VERIFIED**.
- Production configuration changed by this work: **NO**.
