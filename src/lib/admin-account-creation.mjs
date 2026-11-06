import { isUuid } from "./input-validation.mjs";
import { meetsPasswordPolicy } from "./password-policy.mjs";
import { validateAgencyProfileName, validateAgencyProfilePhone } from "./agency-profile-validation.mjs";

export function validateAdminAccountInput(input) {
  const name = validateAgencyProfileName(input.name);
  const phone = validateAgencyProfilePhone(input.phone);
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const code = validateAgencyProfileName(input.code);
  const roles = Array.isArray(input.roles) ? [...new Set(input.roles)] : [];
  if (!isUuid(input.requestId) || !name.ok || !phone.ok || !code.ok ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !meetsPasswordPolicy(input.password) ||
      roles.length === 0 || roles.some((role) => !isUuid(role)) ||
      (input.managerId !== null && !isUuid(input.managerId))) return { ok: false, code: "invalid" };
  return { ok: true, value: { requestId: input.requestId, name: name.value, phone: phone.value, email, code: code.value, roles, managerId: input.managerId, password: input.password } };
}

function ownsIdentity(user, input, actorId) {
  return user?.id === input.requestId && user.email?.toLowerCase() === input.email &&
    user.app_metadata?.admin_creation_request === input.requestId &&
    user.app_metadata?.admin_creation_actor === actorId;
}

// This module is called only from a server action after requireAdmin().
// app_metadata is set through the Admin API and cannot be forged by signup metadata.
export async function provisionAdminAccount({ authAdmin, caller, actorId, input }) {
  let identity;
  let creationError;
  try {
    const created = await authAdmin.createUser({ id: input.requestId, email: input.email, password: input.password, email_confirm: true,
      app_metadata: { admin_creation_request: input.requestId, admin_creation_actor: actorId } });
    identity = created.data?.user;
    creationError = created.error;
  } catch { creationError = { code: "network" }; }
  if (!identity) {
    try { identity = (await authAdmin.getUserById(input.requestId)).data?.user; }
    catch { return { ok: false, code: "service" }; }
  }
  if (!ownsIdentity(identity, input, actorId)) {
    return { ok: false, code: ["email_exists", "email_address_not_authorized", "user_already_exists"].includes(creationError?.code) ? "duplicate" : "service" };
  }
  let error;
  try {
    const result = await caller.rpc("admin_create_business_account", {
      target_auth_user_id: input.requestId, full_name: input.name, account_email: input.email,
      phone_number: input.phone, agent_code: input.code, direct_manager_id: input.managerId, selected_role_ids: input.roles,
    });
    if (!result.error && result.data === input.requestId) return { ok: true, accountId: input.requestId };
    error = result.error;
  } catch { error = { code: "network" }; }
  // A lost response may follow a committed transaction. Never delete its identity.
  try {
    const existing = await caller.from("tai_khoan").select("id").eq("id", input.requestId).maybeSingle();
    if (!existing.error && existing.data?.id === input.requestId) return { ok: true, accountId: input.requestId };
    if (existing.error) return { ok: false, code: "service" };
    // Only an identity carrying this request/actor's server-owned marker is eligible.
    // tai_khoan's ON DELETE RESTRICT FK also protects a concurrent successful retry.
    const cleanup = await authAdmin.deleteUser(input.requestId);
    if (cleanup.error) return { ok: false, code: "cleanup" };
  } catch { return { ok: false, code: "cleanup" }; }
  return { ok: false, code: error?.code === "23505" ? "duplicate" : error?.code === "22023" ? "invalid" : error?.code === "42501" ? "forbidden" : "service" };
}
