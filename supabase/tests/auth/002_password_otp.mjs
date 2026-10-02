import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
const dbUrl = process.env.DB_URL;
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

assert.ok(url, "API_URL is required");
assert.ok(anonKey, "ANON_KEY is required");
assert.ok(serviceRoleKey, "SERVICE_ROLE_KEY is required");
assert.ok(dbUrl, "DB_URL is required");

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const createAnonClient = () => createClient(url, anonKey, clientOptions);
const admin = createClient(url, serviceRoleKey, clientOptions);

const suffix = `${Date.now()}-${process.pid}`;
const email = `phase2-password-${suffix}@example.test`;
const password = "InitialPass1";
const changedPassword = "ChangedPass2";
const recoveredPassword = "RecoveredPass3";

function assertNoError(error, context) {
  assert.equal(error, null, `${context}: ${error?.message ?? "unexpected error"}`);
}

async function purgeAllMail() {
  const response = await fetch(`${mailpitUrl}/api/v1/messages`, {
    method: "DELETE",
  });

  assert.ok(response.ok, `purge Mailpit: HTTP ${response.status}`);
}

async function waitForEmail(address, subjectFragment, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const search = await fetch(
      `${mailpitUrl}/api/v1/search?query=to:${encodeURIComponent(address)}&limit=10`,
    );

    if (search.ok) {
      const result = await search.json();

      for (const item of result.messages ?? []) {
        const subject = item.Subject ?? item.subject ?? "";

        if (!subject.includes(subjectFragment)) {
          continue;
        }

        const detailResponse = await fetch(
          `${mailpitUrl}/api/v1/message/${item.ID ?? item.id}`,
        );

        if (detailResponse.ok) {
          return detailResponse.json();
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return null;
}

function extractEightDigitOtp(message) {
  const body = [
    message?.Text,
    message?.text,
    message?.HTML,
    message?.html,
  ]
    .filter((value) => typeof value === "string")
    .join("\n");

  const match = body.match(/\b\d{8}\b/);
  return match?.[0] ?? null;
}

async function activateAccount(userId) {
  const { error } = await admin
    .from("tai_khoan")
    .update({ trang_thai: "DANG_HOAT_DONG" })
    .eq("id", userId);

  assertNoError(error, "activate account");
}

function expireRecoveryOtp(address) {
  const safeAddress = address.replaceAll("'", "''");

  execFileSync(
    "psql",
    [
      dbUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `update auth.users
       set recovery_sent_at = now() - interval '11 minutes'
       where email = '${safeAddress}'`,
    ],
    { stdio: "pipe" },
  );
}

const config = await readFile("supabase/config.toml", "utf8");
assert.match(config, /minimum_password_length\s*=\s*8/);
assert.match(config, /password_requirements\s*=\s*"lower_upper_letters_digits"/);
assert.match(config, /otp_length\s*=\s*8/);
assert.match(config, /otp_expiry\s*=\s*600/);
assert.match(config, /secure_password_change\s*=\s*true/);

const weakClient = createAnonClient();
const { data: weakSignup, error: weakSignupError } = await weakClient.auth.signUp({
  email: `weak-${email}`,
  password: "lowercase1",
  options: {
    data: {
      registration_type: "SA_SELF_REGISTRATION",
      ho_ten: "Weak Password",
      so_dien_thoai: `07${String(Date.now()).slice(-8)}`,
      ma_dai_ly: `SA-WEAK-${suffix}`,
    },
  },
});

assert.ok(weakSignupError, "provider must reject a password without uppercase");
assert.equal(weakSignup.user, null, "weak password must not create an Auth identity");

const registrationClient = createAnonClient();
const { data: signup, error: signupError } = await registrationClient.auth.signUp({
  email,
  password,
  options: {
    data: {
      registration_type: "SA_SELF_REGISTRATION",
      ho_ten: "Password OTP Integration",
      so_dien_thoai: `06${String(Date.now()).slice(-8)}`,
      ma_dai_ly: `SA-PW-${suffix}`,
    },
  },
});

assertNoError(signupError, "strong-password signup");
assert.ok(signup.user, "strong password must create an Auth identity");
assert.ok(signup.session, "local signup must create a session");

const userId = signup.user.id;
await activateAccount(userId);
await registrationClient.auth.signOut({ scope: "local" });

const changeClient = createAnonClient();
const { data: login, error: loginError } = await changeClient.auth.signInWithPassword({
  email,
  password,
});

assertNoError(loginError, "login before authenticated password change");
assert.ok(login.session, "authenticated password change needs a session");

await purgeAllMail();

const { error: reauthError } = await changeClient.auth.reauthenticate();
assertNoError(reauthError, "request reauthentication OTP");

const reauthEmail = await waitForEmail(email, "Mã OTP đổi mật khẩu IDAILY");
assert.ok(reauthEmail, "reauthentication email must arrive in local Mailpit");

const reauthOtp = extractEightDigitOtp(reauthEmail);
assert.ok(reauthOtp, "reauthentication email must contain an 8-digit OTP");

const { error: changeError } = await changeClient.auth.updateUser({
  password: changedPassword,
  nonce: reauthOtp,
});
assertNoError(changeError, "change password with reauthentication OTP");

await changeClient.auth.signOut({ scope: "local" });

const oldPasswordClient = createAnonClient();
const { error: oldPasswordError } = await oldPasswordClient.auth.signInWithPassword({
  email,
  password,
});
assert.ok(oldPasswordError, "old password must stop authenticating after change");

const changedPasswordClient = createAnonClient();
const { data: changedLogin, error: changedLoginError } =
  await changedPasswordClient.auth.signInWithPassword({
    email,
    password: changedPassword,
  });
assertNoError(changedLoginError, "new password login after authenticated change");
assert.ok(changedLogin.session, "changed password must authenticate");

const { data: passwordClaims, error: passwordClaimsError } =
  await changedPasswordClient.auth.getClaims();
assertNoError(passwordClaimsError, "read password-authenticated JWT claims");
assert.ok(
  Array.isArray(passwordClaims?.claims?.amr) &&
    passwordClaims.claims.amr.some((entry) => entry.method === "password"),
  "email/password login must carry password AMR for business access",
);

await changedPasswordClient.auth.signOut({ scope: "local" });

await purgeAllMail();

const recoveryRequestClient = createAnonClient();
const { error: recoveryRequestError } =
  await recoveryRequestClient.auth.resetPasswordForEmail(email);
assertNoError(recoveryRequestError, "request password recovery OTP");

const recoveryEmail = await waitForEmail(email, "Mã OTP đặt lại mật khẩu IDAILY");
assert.ok(recoveryEmail, "recovery email must arrive in local Mailpit");

const expiredRecoveryOtp = extractEightDigitOtp(recoveryEmail);
assert.ok(expiredRecoveryOtp, "recovery email must contain an 8-digit OTP");

expireRecoveryOtp(email);

const expiredOtpClient = createAnonClient();
const { error: expiredOtpError } = await expiredOtpClient.auth.verifyOtp({
  email,
  token: expiredRecoveryOtp,
  type: "recovery",
});
assert.ok(expiredOtpError, "recovery OTP older than configured 10 minutes must be denied");

await purgeAllMail();

const { error: freshRecoveryRequestError } =
  await recoveryRequestClient.auth.resetPasswordForEmail(email);
assertNoError(freshRecoveryRequestError, "request fresh recovery OTP after expiry");

const freshRecoveryEmail = await waitForEmail(email, "Mã OTP đặt lại mật khẩu IDAILY");
assert.ok(freshRecoveryEmail, "fresh recovery email must arrive after expired OTP");

const recoveryOtp = extractEightDigitOtp(freshRecoveryEmail);
assert.ok(recoveryOtp, "fresh recovery email must contain an 8-digit OTP");

const wrongOtpClient = createAnonClient();
const { error: wrongOtpError } = await wrongOtpClient.auth.verifyOtp({
  email,
  token: "00000000",
  type: "recovery",
});
assert.ok(wrongOtpError, "wrong recovery OTP must be denied");

const recoveryClient = createAnonClient();
const { data: recoveryVerification, error: recoveryVerificationError } =
  await recoveryClient.auth.verifyOtp({
    email,
    token: recoveryOtp,
    type: "recovery",
  });

assertNoError(recoveryVerificationError, "verify valid recovery OTP");
assert.ok(recoveryVerification.session, "valid recovery OTP must create a recovery session");

const { data: recoveryClaims, error: recoveryClaimsError } =
  await recoveryClient.auth.getClaims();
assertNoError(recoveryClaimsError, "read recovery JWT claims");

assert.ok(
  Array.isArray(recoveryClaims?.claims?.amr) &&
    !recoveryClaims.claims.amr.some((entry) => entry.method === "password"),
  "recovery OTP session must not claim password authentication",
);

const { data: rolesDuringRecovery, error: recoveryBusinessError } =
  await recoveryClient.from("vai_tro").select("id");
assertNoError(recoveryBusinessError, "query protected data with recovery JWT");
assert.deepEqual(
  rolesDuringRecovery,
  [],
  "non-password recovery session must not grant protected business-data access",
);

const { error: reuseRecoveryOtpError } = await createAnonClient().auth.verifyOtp({
  email,
  token: recoveryOtp,
  type: "recovery",
});
assert.ok(reuseRecoveryOtpError, "recovery OTP must be single-use");

const { error: sameRecoveryPasswordError } = await recoveryClient.auth.updateUser({
  password: changedPassword,
});
assert.equal(
  sameRecoveryPasswordError?.code,
  "same_password",
  "recovery flow must reject the existing password",
);

const { error: weakRecoveryPasswordError } = await recoveryClient.auth.updateUser({
  password: "lowercase1",
});
assert.equal(
  weakRecoveryPasswordError?.code,
  "weak_password",
  "recovery flow must enforce the configured password policy",
);

const { error: resetError } = await recoveryClient.auth.updateUser({
  password: recoveredPassword,
});
assertNoError(resetError, "set strong password from verified recovery session");

await recoveryClient.auth.signOut({ scope: "local" });

const changedPasswordAfterResetClient = createAnonClient();
const { error: changedAfterResetError } =
  await changedPasswordAfterResetClient.auth.signInWithPassword({
    email,
    password: changedPassword,
  });
assert.ok(
  changedAfterResetError,
  "pre-recovery password must stop authenticating after reset",
);

const finalClient = createAnonClient();
const { data: finalLogin, error: finalLoginError } =
  await finalClient.auth.signInWithPassword({
    email,
    password: recoveredPassword,
  });
assertNoError(finalLoginError, "login with recovered password");
assert.ok(finalLogin.session, "recovered password must authenticate active account");

const unknownRecoveryClient = createAnonClient();
const { error: unknownRecoveryError } =
  await unknownRecoveryClient.auth.resetPasswordForEmail(
    `missing-${suffix}@example.test`,
  );
assertNoError(
  unknownRecoveryError,
  "password recovery request must not reveal whether an account exists",
);

console.log("Phase 2 password policy and OTP integration tests passed.");
