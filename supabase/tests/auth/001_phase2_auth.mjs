import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

assert.ok(url, "API_URL is required");
assert.ok(anonKey, "ANON_KEY is required");
assert.ok(serviceRoleKey, "SERVICE_ROLE_KEY is required");

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
const email = `phase2-${suffix}@example.test`;
const duplicateEmail = `phase2-duplicate-${suffix}@example.test`;
const password = "Phase2Integration1";
const phone = `09${String(Date.now()).slice(-8)}`;
const agentCode = `SA-INT-${suffix}`;

function assertNoError(error, context) {
  assert.equal(error, null, `${context}: ${error?.message ?? "unexpected error"}`);
}

async function accountState(userId) {
  const { data, error } = await admin
    .from("tai_khoan")
    .select("id,trang_thai,dang_nhap_sai_lien_tiep,khoa_tam_den")
    .eq("id", userId)
    .single();

  assertNoError(error, "load account state");
  return data;
}

async function setAccountState(userId, patch) {
  const { error } = await admin
    .from("tai_khoan")
    .update(patch)
    .eq("id", userId);

  assertNoError(error, "update account state");
}

async function assertBusinessDenied(client, label) {
  const { data: roles, error: roleError } = await client
    .from("vai_tro")
    .select("id");

  assertNoError(roleError, `${label}: read role catalog`);
  assert.deepEqual(roles, [], `${label}: protected table must be invisible`);

  const { data: hasRole, error: hasRoleError } = await client.rpc("has_role", {
    role_code: "SA",
  });

  assertNoError(hasRoleError, `${label}: call role helper`);
  assert.equal(hasRole, false, `${label}: role helper must not leak authorization`);

  const {
    data: canViewSelf,
    error: canViewError,
  } = await client.rpc("can_view_activity", {
    activity_owner_id: userId,
  });

  assertNoError(canViewError, `${label}: call activity helper`);
  assert.equal(
    canViewSelf,
    false,
    `${label}: activity helper must not leak authorization`,
  );
}

const registrationClient = createAnonClient();

const {
  data: registration,
  error: registrationError,
} = await registrationClient.auth.signUp({
  email,
  password,
  options: {
    data: {
      registration_type: "SA_SELF_REGISTRATION",
      ho_ten: "Phase 2 Integration SA",
      so_dien_thoai: phone,
      ma_dai_ly: agentCode,
    },
  },
});

assertNoError(registrationError, "SA sign-up");
assert.ok(registration.user, "SA sign-up must create one Auth user");
assert.ok(
  registration.session,
  "local config must keep email confirmation disabled for the Phase 2 flow",
);

const userId = registration.user.id;
let account = await accountState(userId);

assert.equal(account.id, userId, "tai_khoan.id must equal auth.users.id");
assert.equal(
  account.trang_thai,
  "CHO_PHE_DUYET",
  "new SA business account must start pending",
);
assert.equal(account.dang_nhap_sai_lien_tiep, 0);
assert.equal(account.khoa_tam_den, null);

const {
  data: assignment,
  error: assignmentError,
} = await admin
  .from("phan_cong_vai_tro")
  .select("vai_tro_id")
  .eq("tai_khoan_id", userId)
  .single();

assertNoError(assignmentError, "load SA role assignment");
assert.equal(
  assignment.vai_tro_id,
  "10000000-0000-0000-0000-000000000004",
  "self-registration must assign only the SA role",
);

const { data: usersPage, error: usersError } =
  await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

assertNoError(usersError, "list Auth users");
assert.equal(
  usersPage.users.filter((user) => user.email === email).length,
  1,
  "registration must create exactly one Auth identity",
);

await assertBusinessDenied(registrationClient, "pending account");

const { error: deniedWriteError } = await registrationClient
  .from("khach_hang")
  .insert({
    chu_so_huu_id: userId,
    ma_khach_hang: `KH-${suffix}`,
    ho_ten: "Denied Pending Customer",
    so_dien_thoai: `08${String(Date.now()).slice(-8)}`,
    gioi_tinh: "KHAC",
    ngay_sinh: "1990-01-01",
    dia_chi: "Test",
    so_thich: "Test",
    ghi_chu: "Test",
    loai_khach_hang: "MUC_TIEU",
    tinh_trang: "BẠN",
    nhom_tinh_cach: "D",
  });

assert.ok(deniedWriteError, "pending account must be denied protected writes");

const duplicateClient = createAnonClient();
const {
  data: duplicateRegistration,
  error: duplicateError,
} = await duplicateClient.auth.signUp({
  email: duplicateEmail,
  password,
  options: {
    data: {
      registration_type: "SA_SELF_REGISTRATION",
      ho_ten: "Duplicate Business Identifier",
      so_dien_thoai: phone,
      ma_dai_ly: `SA-DUP-${suffix}`,
    },
  },
});

assert.ok(duplicateError, "duplicate business identifier must reject sign-up");
assert.equal(
  duplicateRegistration.user,
  null,
  "failed duplicate sign-up must not return an Auth user",
);

const { data: usersAfterDuplicate, error: usersAfterDuplicateError } =
  await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

assertNoError(usersAfterDuplicateError, "list Auth users after duplicate sign-up");
assert.equal(
  usersAfterDuplicate.users.some((user) => user.email === duplicateEmail),
  false,
  "duplicate business identifier must roll back Auth user creation",
);

await setAccountState(userId, {
  trang_thai: "DANG_HOAT_DONG",
  dang_nhap_sai_lien_tiep: 0,
  khoa_tam_den: null,
});

const activeClient = createAnonClient();
const { data: activeLogin, error: activeLoginError } =
  await activeClient.auth.signInWithPassword({ email, password });

assertNoError(activeLoginError, "active valid-credential login");
assert.ok(activeLogin.session, "active valid-credential login must create a session");

const { data: activeRoles, error: activeRolesError } = await activeClient
  .from("vai_tro")
  .select("id");

assertNoError(activeRolesError, "active account read");
assert.ok(activeRoles.length > 0, "active account must regain normal RLS access");

for (let attempt = 1; attempt <= 6; attempt += 1) {
  const badClient = createAnonClient();
  const { data, error } = await badClient.auth.signInWithPassword({
    email,
    password: `${password}-wrong`,
  });

  assert.ok(error, `bad password attempt ${attempt} must fail`);
  assert.equal(data.session, null, `bad password attempt ${attempt} must not create a session`);
}

account = await accountState(userId);
assert.equal(
  account.dang_nhap_sai_lien_tiep,
  6,
  "six direct public Auth failures must reach the business counter",
);
assert.ok(account.khoa_tam_den, "six failures must create a temporary lock");
assert.ok(
  Date.parse(account.khoa_tam_den) > Date.now() + 29 * 60 * 1000,
  "temporary lock must be approximately 30 minutes",
);

await assertBusinessDenied(activeClient, "existing JWT after temporary lock");

const lockedCorrectClient = createAnonClient();
const {
  data: lockedCorrectLogin,
  error: lockedCorrectError,
} = await lockedCorrectClient.auth.signInWithPassword({ email, password });

assert.ok(
  lockedCorrectError,
  "correct password must still be rejected while temporary lock is active",
);
assert.equal(
  lockedCorrectLogin.session,
  null,
  "temporary lock must prevent a new Auth session",
);

await setAccountState(userId, {
  khoa_tam_den: new Date(Date.now() - 60_000).toISOString(),
});

const recoveredClient = createAnonClient();
const { data: recoveredLogin, error: recoveredLoginError } =
  await recoveredClient.auth.signInWithPassword({ email, password });

assertNoError(recoveredLoginError, "valid login after lock expiry");
assert.ok(recoveredLogin.session, "valid login after lock expiry must succeed");

account = await accountState(userId);
assert.equal(
  account.dang_nhap_sai_lien_tiep,
  0,
  "successful verification after expiry must reset the failure counter",
);
assert.equal(
  account.khoa_tam_den,
  null,
  "successful verification after expiry must clear the expired lock",
);

const { data: refreshed, error: refreshError } =
  await recoveredClient.auth.refreshSession();

assertNoError(refreshError, "refresh active session");
assert.ok(refreshed.session, "session refresh must return a valid session");

const { data: refreshedRoles, error: refreshedRolesError } =
  await recoveredClient.from("vai_tro").select("id");

assertNoError(refreshedRolesError, "read after session refresh");
assert.ok(
  refreshedRoles.length > 0,
  "refreshed authenticated session must still pass account-state RLS",
);

await setAccountState(userId, { trang_thai: "KHOA" });
await assertBusinessDenied(recoveredClient, "administratively locked account");

await setAccountState(userId, { trang_thai: "CHO_PHE_DUYET" });
await assertBusinessDenied(recoveredClient, "pending account with valid JWT");

await setAccountState(userId, { trang_thai: "DANG_HOAT_DONG" });

const { error: logoutError } = await recoveredClient.auth.signOut({
  scope: "local",
});

assertNoError(logoutError, "local/current-session logout");

const {
  data: { session: sessionAfterLogout },
  error: sessionAfterLogoutError,
} = await recoveredClient.auth.getSession();

assertNoError(sessionAfterLogoutError, "read session after logout");
assert.equal(sessionAfterLogout, null, "local logout must remove the current client session");

const {
  data: anonymousRoles,
  error: anonymousRolesError,
} = await recoveredClient.from("vai_tro").select("id");

assert.ok(
  anonymousRolesError || anonymousRoles?.length === 0,
  "subsequent protected request after logout must not have authenticated access",
);

console.log("Phase 2 Auth integration tests passed.");
