/* eslint @typescript-eslint/no-require-imports: "off" -- Shared CJS fixtures for browser scripts. */
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");

assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.API_URL).hostname), "Browser fixtures may only use local Supabase");
const setup = createClient(process.env.API_URL, process.env.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const roles = { ADMIN: "000001", DM: "000002", UM: "000003", SA: "000004" };
const password = "BrowserFixture1";
async function fixture(role, managerId = null) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const email = `browser-${role.toLowerCase()}-${suffix}@example.test`;
  const { data, error } = await setup.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(error, null);
  const id = data.user.id;
  const name = `Browser ${role} ${suffix}`;
  const code = `B_${role}_${suffix}`;
  assert.equal((await setup.from("tai_khoan").insert({ id, ho_ten: name, email, so_dien_thoai: `B-${suffix}`, ma_dai_ly: code, manager_id: managerId, trang_thai: "DANG_HOAT_DONG" })).error, null);
  assert.equal((await setup.from("phan_cong_vai_tro").insert({ tai_khoan_id: id, vai_tro_id: `10000000-0000-0000-0000-000000${roles[role]}` })).error, null);
  return { id, name, code, email, password };
}
async function login(page, user) {
  await page.goto((process.env.E2E_BASE_URL || "http://localhost:3000") + "/login");
  await page.locator('form[data-draft-persistence-ready="true"]').waitFor();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL("**/dashboard");
}
module.exports = { setup, fixture, login };
