/* eslint @typescript-eslint/no-require-imports: "off" -- CJS for CI npm exec Playwright. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { fixture, login } = require("./browser-fixtures.cjs");

(async () => {
  const dm = await fixture("DM");
  const recipient = await fixture("SA", dm.id);
  const admin = await fixture("ADMIN");
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage();
    await login(page, dm);
    for (const width of [375, 768, 1024, 1440]) {
      await page.evaluate(() => sessionStorage.clear());
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://localhost:3000/notifications/new");
      await page.locator('form[data-draft-persistence-ready="true"]').waitFor();
      await page.locator('[name="tieu_de"]').fill("Picker test");
      await page.locator('[name="noi_dung"]').fill("Picker test content");
      await page.getByRole("button", { name: "Tạo bản nháp", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Chọn ít nhất" }).waitFor();
      const search = page.getByRole("searchbox", { name: "Tìm người nhận" });
      assert.equal(await search.evaluate((input) => input === document.activeElement), true);
      assert.ok(await search.getAttribute("aria-describedby"));
      await search.fill(recipient.name);
      const checkbox = page.locator(`input[name="recipient_ids"][value="${recipient.id}"]`);
      await checkbox.focus();
      await page.keyboard.press("Space");
      assert.equal(await checkbox.isChecked(), true);
      await search.fill("no-matching-recipient");
      assert.equal(await checkbox.isChecked(), true, "filtered-out choices retain selection");
      await page.getByRole("button", { name: `Bỏ chọn ${recipient.name}`, exact: true }).click();
      assert.equal(await checkbox.isChecked(), false);
      assert.equal(await page.locator('[role="group"][aria-invalid]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      console.log(`Recipient picker ${width}px PASS`);
    }
    await page.context().clearCookies();
    await login(page, admin);
    await page.goto("http://localhost:3000/admin/roles/new");
    await page.locator('form[data-draft-persistence-ready="true"]').waitFor();
    const permission = page.locator('input[name="permission_ids"]').first();
    await permission.focus();
    await page.keyboard.press("Space");
    assert.equal(await permission.isChecked(), true);
    console.log("Checkbox picker browser PASS: 4 widths, required error/focus, keyboard toggle, filtering retention, removal and permission picker.");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
