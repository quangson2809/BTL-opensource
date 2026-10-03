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

function expireReauthenticationOtp(address) {
  const safeAddress = address.replaceAll("'", "''");

  execFileSync(
    "psql",
    [
      dbUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `update auth.users
       set reauthentication_sent_at = now() - interval '11 minutes'
       where email = '${safeAddress}'`,
    ],
    { stdio: "pipe" },
  );
}

async function seedRecoveryIsolationFixtures(userId) {
  const permissionId = "20000000-0000-0000-0000-000000000001";
  const saRoleId = "10000000-0000-0000-0000-000000000004";
  const customerId = crypto.randomUUID();
  const activityId = crypto.randomUUID();
  const notificationId = crypto.randomUUID();
  const recipientId = crypto.randomUUID();
  const rolePermissionId = crypto.randomUUID();

  const { error: rolePermissionError } = await admin
    .from("phan_quyen_vai_tro")
    .insert({
      id: rolePermissionId,
      vai_tro_id: saRoleId,
      quyen_id: permissionId,
      nguoi_gan_id: null,
    });
  assertNoError(rolePermissionError, "grant test permission to SA");

  const { error: customerError } = await admin.from("khach_hang").insert({
    id: customerId,
    chu_so_huu_id: userId,
    ma_khach_hang: `KH-OTP-${suffix}`,
    ho_ten: "Recovery Isolation Customer",
    so_dien_thoai: `05${String(Date.now()).slice(-8)}`,
    gioi_tinh: "Nam",
    ngay_sinh: "1990-01-01",
    dia_chi: "Hà Nội",
    so_thich: "Kiểm thử",
    ghi_chu: "Recovery isolation fixture",
    loai_khach_hang: "MUC_TIEU",
    tinh_trang: "BẠN",
    nhom_tinh_cach: "D",
  });
  assertNoError(customerError, "create customer fixture");

  const { error: activityError } = await admin.from("hoat_dong").insert({
    id: activityId,
    tai_khoan_id: userId,
    loai_hoat_dong: "GẶP_GỠ",
    dia_diem: "Hà Nội",
    thoi_gian: new Date().toISOString(),
    so_khach_hang_ket_noi: 1,
  });
  assertNoError(activityError, "create activity fixture");

  const { error: notificationError } = await admin.from("thong_bao").insert({
    id: notificationId,
    nguoi_tao_id: userId,
    tieu_de: "Recovery isolation",
    noi_dung: "Fixture",
    loai: "TIN_TỨC",
    trang_thai: "ĐÃ_GỬI",
  });
  assertNoError(notificationError, "create notification fixture");

  const { error: recipientError } = await admin.from("thong_bao_nguoi_nhan").insert({
    id: recipientId,
    thong_bao_id: notificationId,
    tai_khoan_id: userId,
    da_doc: false,
  });
  assertNoError(recipientError, "create notification-recipient fixture");

  return {
    userId,
    saRoleId,
    permissionId,
    rolePermissionId,
    customerId,
    activityId,
    notificationId,
    recipientId,
  };
}

async function assertVisibleById(client, table, id, label) {
  const { data, error } = await client.from(table).select("id").eq("id", id);
  assertNoError(error, `${label}: query ${table}`);
  assert.equal(data.length, 1, `${label}: expected visible row in ${table}`);
}

async function assertHiddenById(client, table, id, label) {
  const { data, error } = await client.from(table).select("id").eq("id", id);
  assertNoError(error, `${label}: query ${table}`);
  assert.deepEqual(data, [], `${label}: ${table} must be hidden`);
}

async function assertNormalBusinessMatrix(client, fixture) {
  await assertVisibleById(client, "tai_khoan", fixture.userId, "password session");
  await assertVisibleById(client, "vai_tro", fixture.saRoleId, "password session");
  await assertVisibleById(client, "quyen", fixture.permissionId, "password session");

  const { data: ownAssignment, error: ownAssignmentError } = await client
    .from("phan_cong_vai_tro")
    .select("id")
    .eq("tai_khoan_id", fixture.userId);
  assertNoError(ownAssignmentError, "password session: query role assignment");
  assert.ok(ownAssignment.length > 0, "password session: own role assignment must be visible");

  await assertVisibleById(
    client,
    "phan_quyen_vai_tro",
    fixture.rolePermissionId,
    "password session",
  );
  await assertVisibleById(client, "khach_hang", fixture.customerId, "password session");
  await assertVisibleById(client, "hoat_dong", fixture.activityId, "password session");
  await assertVisibleById(client, "thong_bao", fixture.notificationId, "password session");
  await assertVisibleById(
    client,
    "thong_bao_nguoi_nhan",
    fixture.recipientId,
    "password session",
  );

  const { data: hasRole, error: hasRoleError } = await client.rpc("has_role", {
    role_code: "SA",
  });
  assertNoError(hasRoleError, "password session: has_role");
  assert.equal(hasRole, true, "password session: has_role must have positive control");

  const { data: hasPermission, error: hasPermissionError } = await client.rpc(
    "has_permission",
    { permission_code: "ACTIVITY_VIEW_SUBTREE" },
  );
  assertNoError(hasPermissionError, "password session: has_permission");
  assert.equal(
    hasPermission,
    true,
    "password session: has_permission must have positive control",
  );

  const { data: inSubtree, error: inSubtreeError } = await client.rpc(
    "is_in_subtree",
    { target_account_id: fixture.userId },
  );
  assertNoError(inSubtreeError, "password session: is_in_subtree");
  assert.equal(inSubtree, true, "password session: self must be in subtree helper");

  const { data: canView, error: canViewError } = await client.rpc(
    "can_view_activity",
    { activity_owner_id: fixture.userId },
  );
  assertNoError(canViewError, "password session: can_view_activity");
  assert.equal(canView, true, "password session: own activity must be allowed");
}

async function assertRecoveryBusinessMatrix(client, fixture) {
  await assertHiddenById(client, "tai_khoan", fixture.userId, "recovery session");
  await assertHiddenById(client, "vai_tro", fixture.saRoleId, "recovery session");
  await assertHiddenById(client, "quyen", fixture.permissionId, "recovery session");
  await assertHiddenById(
    client,
    "phan_quyen_vai_tro",
    fixture.rolePermissionId,
    "recovery session",
  );
  await assertHiddenById(client, "khach_hang", fixture.customerId, "recovery session");
  await assertHiddenById(client, "hoat_dong", fixture.activityId, "recovery session");
  await assertHiddenById(client, "thong_bao", fixture.notificationId, "recovery session");
  await assertHiddenById(
    client,
    "thong_bao_nguoi_nhan",
    fixture.recipientId,
    "recovery session",
  );

  const { data: assignments, error: assignmentsError } = await client
    .from("phan_cong_vai_tro")
    .select("id")
    .eq("tai_khoan_id", fixture.userId);
  assertNoError(assignmentsError, "recovery session: query role assignment");
  assert.deepEqual(assignments, [], "recovery session: role assignment must be hidden");

  const rpcCases = [
    ["has_role", { role_code: "SA" }],
    ["has_permission", { permission_code: "ACTIVITY_VIEW_SUBTREE" }],
    ["is_in_subtree", { target_account_id: fixture.userId }],
    ["can_view_activity", { activity_owner_id: fixture.userId }],
  ];

  for (const [name, args] of rpcCases) {
    const { data, error } = await client.rpc(name, args);
    assertNoError(error, `recovery session: ${name}`);
    assert.equal(data, false, `recovery session: ${name} must not leak state`);
  }
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

const { error: noNonceError } = await changeClient.auth.updateUser({
  password: "NoNoncePass9",
});
assert.equal(
  noNonceError?.code,
  "reauthentication_needed",
  "fresh password session must not bypass email OTP by omitting nonce",
);

await purgeAllMail();

const { error: reauthError } = await changeClient.auth.reauthenticate();
assertNoError(reauthError, "request reauthentication OTP");

const reauthEmail = await waitForEmail(email, "Mã OTP đổi mật khẩu IDAILY");
assert.ok(reauthEmail, "reauthentication email must arrive in local Mailpit");

const reauthOtp = extractEightDigitOtp(reauthEmail);
assert.ok(reauthOtp, "reauthentication email must contain an 8-digit OTP");

const { error: wrongReauthError } = await changeClient.auth.updateUser({
  password: "WrongOtpPass9",
  nonce: "00000000",
});
assert.equal(
  wrongReauthError?.code,
  "reauthentication_not_valid",
  "fresh password session with wrong reauthentication OTP must be denied",
);

expireReauthenticationOtp(email);

const { error: expiredReauthError } = await changeClient.auth.updateUser({
  password: "ExpiredOtpPass9",
  nonce: reauthOtp,
});
assert.ok(
  expiredReauthError,
  "fresh password session with expired reauthentication OTP must be denied",
);

await purgeAllMail();

const { error: freshReauthError } = await changeClient.auth.reauthenticate();
assertNoError(freshReauthError, "request fresh reauthentication OTP");

const freshReauthEmail = await waitForEmail(email, "Mã OTP đổi mật khẩu IDAILY");
assert.ok(freshReauthEmail, "fresh reauthentication email must arrive in local Mailpit");

const freshReauthOtp = extractEightDigitOtp(freshReauthEmail);
assert.ok(freshReauthOtp, "fresh reauthentication email must contain an 8-digit OTP");

const { error: changeError } = await changeClient.auth.updateUser({
  password: changedPassword,
  nonce: freshReauthOtp,
});
assertNoError(changeError, "change password with valid reauthentication OTP");

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

const { error: reusedNonceError } = await changedPasswordClient.auth.updateUser({
  password: "ReuseNoncePass9",
  nonce: freshReauthOtp,
});
assert.equal(
  reusedNonceError?.code,
  "reauthentication_not_valid",
  "consumed reauthentication OTP must not be reusable in a new password session",
);

const isolationFixture = await seedRecoveryIsolationFixtures(userId);
await assertNormalBusinessMatrix(changedPasswordClient, isolationFixture);

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

await assertRecoveryBusinessMatrix(recoveryClient, isolationFixture);

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
