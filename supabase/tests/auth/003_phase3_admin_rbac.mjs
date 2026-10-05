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
const setup = createClient(url, serviceRoleKey, clientOptions);

const ADMIN_ROLE_ID = "10000000-0000-0000-0000-000000000001";
const DM_ROLE_ID = "10000000-0000-0000-0000-000000000002";
const UM_ROLE_ID = "10000000-0000-0000-0000-000000000003";

const suffix = `${Date.now()}-${process.pid}`;
const adminEmail = `phase3-admin-${suffix}@example.test`;
const adminPassword = "Phase3AdminPassword1";
const saEmail = `phase3-sa-${suffix}@example.test`;
const saPassword = "Phase3SaPassword1";
const adminPhone = `07${String(Date.now()).slice(-8)}`;
const saPhone = `08${String(Date.now() + 1).slice(-8)}`;

function assertNoError(error, context) {
  assert.equal(error, null, `${context}: ${error?.message ?? "unexpected error"}`);
}

async function hasRole(client, roleCode) {
  const { data, error } = await client.rpc("has_role", {
    role_code: roleCode,
  });
  assertNoError(error, `has_role(${roleCode})`);
  return data;
}

const { data: adminIdentity, error: adminIdentityError } =
  await setup.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

assertNoError(adminIdentityError, "create Admin Auth fixture");
assert.ok(adminIdentity.user, "Admin Auth fixture must exist");
const adminId = adminIdentity.user.id;

const { error: adminAccountError } = await setup.from("tai_khoan").insert({
  id: adminId,
  ho_ten: "Phase 3 Integration Admin",
  email: adminEmail,
  so_dien_thoai: adminPhone,
  ma_dai_ly: `ADMIN-${suffix}`,
  manager_id: null,
  trang_thai: "DANG_HOAT_DONG",
});

assertNoError(adminAccountError, "create Admin business fixture");

const { error: adminRoleError } = await setup.from("phan_cong_vai_tro").insert({
  tai_khoan_id: adminId,
  vai_tro_id: ADMIN_ROLE_ID,
});

assertNoError(adminRoleError, "assign Admin fixture role");

const saClient = createAnonClient();
const { data: saRegistration, error: saRegistrationError } =
  await saClient.auth.signUp({
    email: saEmail,
    password: saPassword,
    options: {
      data: {
        registration_type: "SA_SELF_REGISTRATION",
        ho_ten: "Phase 3 Integration SA",
        so_dien_thoai: saPhone,
        ma_dai_ly: `SA-P3-${suffix}`,
      },
    },
  });

assertNoError(saRegistrationError, "create pending SA");
assert.ok(saRegistration.user, "pending SA Auth user must exist");
assert.ok(saRegistration.session, "pending SA test needs an existing JWT");
const saId = saRegistration.user.id;

const adminClient = createAnonClient();
const { data: adminLogin, error: adminLoginError } =
  await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

assertNoError(adminLoginError, "Admin password login");
assert.ok(adminLogin.session, "Admin login must create a user-scoped session");
assert.equal(await hasRole(adminClient, "ADMIN"), true, "Admin role must be active");

const { data: accountList, error: accountListError } = await adminClient
  .from("tai_khoan")
  .select("id");

assertNoError(accountListError, "Admin read account list");
assert.ok(
  accountList.some((account) => account.id === adminId) &&
    accountList.some((account) => account.id === saId),
  "Admin account list must include Admin and pending SA",
);

const { data: pendingRoles, error: pendingRolesError } = await saClient
  .from("vai_tro")
  .select("id");

assertNoError(pendingRolesError, "pending SA role catalog read");
assert.deepEqual(pendingRoles, [], "pending SA must have no business-data access");

const { error: approveError } = await adminClient.rpc("admin_approve_account", {
  target_account_id: saId,
});

assertNoError(approveError, "Admin approve pending SA");

const { data: approvedAccountRows, error: approvedAccountRowsError } = await saClient
  .from("tai_khoan")
  .select("id");

assertNoError(approvedAccountRowsError, "approved SA account read");
assert.deepEqual(
  approvedAccountRows.map((account) => account.id),
  [saId],
  "approved SA existing JWT must regain normal self-scoped business access",
);
assert.equal(await hasRole(saClient, "SA"), true, "approved SA role helper must work");

const { error: lockError } = await adminClient.rpc("admin_lock_account", {
  target_account_id: saId,
});

assertNoError(lockError, "Admin lock active SA");

const { data: lockedRoles, error: lockedRolesError } = await saClient
  .from("vai_tro")
  .select("id");

assertNoError(lockedRolesError, "locked SA protected read");
assert.deepEqual(
  lockedRoles,
  [],
  "existing JWT must lose business-data access immediately after Admin lock",
);
assert.equal(await hasRole(saClient, "SA"), false, "locked SA role helper must be disabled");

const { error: unlockError } = await adminClient.rpc("admin_unlock_account", {
  target_account_id: saId,
});

assertNoError(unlockError, "Admin unlock SA");
assert.equal(await hasRole(saClient, "SA"), true, "unlocked SA must regain business access");

const { error: assignRoleError } = await adminClient.rpc("admin_assign_role", {
  target_account_id: saId,
  target_role_id: UM_ROLE_ID,
});

assertNoError(assignRoleError, "Admin assign UM role");
assert.equal(await hasRole(saClient, "UM"), true, "role helper must reflect assignment");

const { error: revokeRoleError } = await adminClient.rpc("admin_revoke_role", {
  target_account_id: saId,
  target_role_id: UM_ROLE_ID,
});

assertNoError(revokeRoleError, "Admin revoke UM role");
assert.equal(await hasRole(saClient, "UM"), false, "role helper must reflect revoke");

const { data: roles, error: rolesError } = await adminClient
  .from("vai_tro")
  .select("id,ma_vai_tro");
const { data: permissions, error: permissionsError } = await adminClient
  .from("quyen")
  .select("id,ma_quyen");
const { data: mappings, error: mappingsError } = await adminClient
  .from("phan_quyen_vai_tro")
  .select("vai_tro_id,quyen_id");

assertNoError(rolesError, "Admin list roles");
assertNoError(permissionsError, "Admin list permissions");
assertNoError(mappingsError, "Admin list role-permission mappings");
assert.ok(roles.length >= 4, "Admin must see role catalog");
assert.ok(permissions.length >= 1, "Admin must see permission catalog");
assert.ok(mappings.length >= 1, "Admin must see role-permission mappings");

const { error: nonAdminAssignError } = await saClient.rpc("admin_assign_role", {
  target_account_id: saId,
  target_role_id: DM_ROLE_ID,
});

assert.ok(nonAdminAssignError, "non-Admin cannot invoke role assignment RPC");

const { error: directRoleInsertError } = await saClient
  .from("phan_cong_vai_tro")
  .insert({
    tai_khoan_id: saId,
    vai_tro_id: DM_ROLE_ID,
  });

assert.ok(directRoleInsertError, "non-Admin direct role assignment must be blocked");

const { error: nonAdminRevokeError } = await saClient.rpc("admin_revoke_role", {
  target_account_id: saId,
  target_role_id: "10000000-0000-0000-0000-000000000004",
});

assert.ok(nonAdminRevokeError, "non-Admin cannot invoke role revoke RPC");

const { error: directStatusUpdateError } = await saClient
  .from("tai_khoan")
  .update({ trang_thai: "KHOA" })
  .eq("id", saId);

assert.ok(
  directStatusUpdateError,
  "non-Admin direct account lifecycle mutation must be blocked",
);

console.log("Phase 3 Admin/RBAC integration tests passed.");
