import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAdminAccountInput, provisionAdminAccount } from "../src/lib/admin-account-creation.mjs";

const actorId = "10000000-0000-4000-8000-000000000001";
const input = { requestId: "20000000-0000-4000-8000-000000000001", name: "New user", phone: "0912345678", email: "new@example.test", code: "NEW_001", password: "InitialPassword1", managerId: null, roles: ["30000000-0000-4000-8000-000000000001"] };
function harness(options = {}) {
  const calls = [];
  const identity = { id: input.requestId, email: input.email, app_metadata: { admin_creation_request: input.requestId, admin_creation_actor: actorId } };
  let committed = Boolean(options.committed);
  const authAdmin = {
    async createUser(attributes) { calls.push(["create", attributes]); return options.retry ? { data: {}, error: { code: "email_exists" } } : { data: { user: options.foreign ? { ...identity, app_metadata: {} } : identity }, error: null }; },
    async getUserById() { return { data: { user: identity }, error: null }; },
    async deleteUser(id) { calls.push(["delete", id]); return { error: options.cleanupError ? { code: "failure" } : null }; },
  };
  const caller = {
    async rpc() { calls.push(["rpc"]); if (options.lostResponse) { committed = true; throw new Error("network"); } return { data: options.rpcError ? null : input.requestId, error: options.rpcError ?? null }; },
    from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: committed ? { id: input.requestId } : null, error: null }; } }; },
  };
  return { authAdmin, caller, actorId, input, calls };
}
test("account creation rejects malformed profile, weak password and untrusted identifiers", () => {
  assert.equal(validateAdminAccountInput(input).ok, true);
  for (const change of [{ password: "weak" }, { requestId: "bad" }, { roles: [] }, { roles: ["bad"] }, { name: "Bad\nname" }, { phone: "x" }, { managerId: "bad" }]) assert.equal(validateAdminAccountInput({ ...input, ...change }).ok, false);
});
test("server creates a request-bound identity and provisions through caller JWT", async () => {
  const h = harness();
  assert.deepEqual(await provisionAdminAccount(h), { ok: true, accountId: input.requestId });
  assert.equal(h.calls[0][1].app_metadata.admin_creation_actor, actorId);
  assert.equal(h.calls.some(([name]) => name === "delete"), false);
});
test("retry recovers only the identity owned by the same actor/request", async () => {
  assert.equal((await provisionAdminAccount(harness({ retry: true }))).ok, true);
  const h = harness({ foreign: true });
  assert.equal((await provisionAdminAccount(h)).ok, false);
  assert.equal(h.calls.some(([name]) => name === "rpc" || name === "delete"), false);
});
test("business failure compensates only its newly created identity", async () => {
  const h = harness({ rpcError: { code: "23505" } });
  assert.deepEqual(await provisionAdminAccount(h), { ok: false, code: "duplicate" });
  assert.deepEqual(h.calls.at(-1), ["delete", input.requestId]);
  assert.deepEqual(await provisionAdminAccount(harness({ rpcError: { code: "22023" }, cleanupError: true })), { ok: false, code: "cleanup" });
});
test("a committed transaction with a lost response never deletes an existing account", async () => {
  const h = harness({ lostResponse: true });
  assert.equal((await provisionAdminAccount(h)).ok, true);
  assert.equal(h.calls.some(([name]) => name === "delete"), false);
});
