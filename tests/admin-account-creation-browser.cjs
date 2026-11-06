/* eslint @typescript-eslint/no-require-imports: "off" -- CJS Playwright runner. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { fixture, login, setup } = require("./browser-fixtures.cjs");

(async () => {
  const admin = await fixture("ADMIN");
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage();
    await login(page, admin);
    await page.goto("http://localhost:3000/admin/accounts/new");
    await page.locator('form[data-draft-persistence-ready="true"]').waitFor();
    const suffix = Date.now();
    const email = `browser-created-${suffix}@example.test`;
    const password = "BrowserCreatedPassword1";
    await page.getByLabel("Họ tên", { exact: true }).fill("Browser Created DM");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Số điện thoại", { exact: true }).fill("06" + String(suffix).slice(-8));
    await page.getByLabel("Mã đại lý", { exact: true }).fill(`CREATED_${suffix}`);
    await page.getByLabel("Mật khẩu ban đầu", { exact: true }).fill(password);
    await page.locator('input[name="role_ids"][value="10000000-0000-0000-0000-000000000002"]').check();
    await page.waitForFunction(() => Object.keys(sessionStorage).some((key) => key.endsWith(":admin-account-create")));
    assert.equal(await page.evaluate((value) => JSON.stringify(sessionStorage).includes(value), password), false);
    await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
    await page.waitForURL(/\/admin\/accounts\/[a-f0-9-]+\?status=created/);
    const id = new URL(page.url()).pathname.split("/").at(-1);
    const account = await setup.from("tai_khoan").select("email,trang_thai").eq("id", id).single();
    assert.equal(account.data.email, email);
    assert.equal(account.data.trang_thai, "DANG_HOAT_DONG");
    assert.equal(await page.locator('input[type="password"]').count(), 0);
    console.log("Admin account browser PASS: active DM created through UI; password excluded from draft and result page.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
