/* eslint @typescript-eslint/no-require-imports: "off" -- CJS for Playwright runner. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const { fixture, login } = require("./browser-fixtures.cjs");

(async () => {
  const admin = await fixture("ADMIN");
  const sa = await fixture("SA");
  const caller = createClient(process.env.API_URL, process.env.ANON_KEY, { auth: { persistSession: false } });
  assert.equal((await caller.auth.signInWithPassword({ email: admin.email, password: admin.password })).error, null);
  const suffix = Date.now();
  const created = await caller.rpc("admin_create_role", { role_code: `BROWSER_${suffix}`, role_name: `Before ${suffix}`, role_description: "Before", permission_ids: [] });
  assert.equal(created.error, null);
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage();
    await login(page, admin);
    await page.goto(`http://localhost:3000/admin/roles/${created.data}/edit`);
    await page.locator('form[data-draft-persistence-ready="true"]').waitFor();
    await page.getByLabel("Tên vai trò", { exact: true }).fill(`After ${suffix}`);
    await page.locator('textarea[name="mo_ta"]').fill("Updated description");
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await page.waitForURL(/\/admin\/roles\?status=updated/);
    const row = await caller.from("vai_tro").select("ten_vai_tro,mo_ta").eq("id", created.data).single();
    assert.equal(row.data.ten_vai_tro, `After ${suffix}`);
    assert.equal(row.data.mo_ta, "Updated description");
    await page.goto("http://localhost:3000/admin/roles/10000000-0000-0000-0000-000000000002/edit");
    assert.equal(await page.getByLabel("Tên vai trò", { exact: true }).isEditable(), false);
    assert.equal(await page.locator('textarea[name="mo_ta"]').isEditable(), false);
    assert.ok(await page.locator('input[name="permission_ids"]').count());
    await page.goto("http://localhost:3000/admin/roles/10000000-0000-0000-0000-000000000001/edit");
    assert.equal(await page.locator('input[name="role_id"]').count(), 0, "protected role exposes no editor, including streamed not-found responses");
    assert.ok(await page.locator('meta[name="robots"][content*="noindex"]').count());
    const deniedPage = await browser.newPage();
    await login(deniedPage, sa);
    await deniedPage.goto(`http://localhost:3000/admin/roles/${created.data}/edit`);
    await deniedPage.waitForURL("**/access-denied");
    console.log("Role editor browser PASS: custom metadata saved, system metadata read-only, ADMIN protected, SA denied.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
