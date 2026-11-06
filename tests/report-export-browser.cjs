/* eslint @typescript-eslint/no-require-imports: "off" -- CJS Playwright runner. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { readSheet } = require("read-excel-file/node");
const { fixture, login } = require("./browser-fixtures.cjs");

(async () => {
  const sa = await fixture("SA");
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage();
    await login(page, sa);
    await page.goto("http://localhost:3000/reports/export-options?period=month&anchor=2026-11-01");
    await page.getByLabel("Ngày tham chiếu", { exact: true }).fill("2026-10-06");
    await page.locator('select[name="period"]').selectOption("week");
    await page.locator('select[name="scope"]').selectOption("self");
    await page.locator('input[name="columns"]').first().waitFor();
    for (const input of await page.locator('input[name="columns"]').all()) await input.uncheck();
    await page.getByRole("button", { name: "Tải báo cáo", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Chọn ít nhất" }).waitFor();
    await page.locator('input[name="columns"][value="ho_ten"]').check();
    await page.locator('input[name="columns"][value="activity_count"]').check();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Tải báo cáo", exact: true }).click();
    const file = await downloaded;
    assert.equal(file.suggestedFilename(), "idaily-report-2026-10-06-week.xlsx");
    const data = await readSheet(await file.path());
    assert.deepEqual(data[0], ["Nhân sự", "Hoạt động"]);
    assert.equal(data.length, 2);
    assert.equal(data[1][0], sa.name);
    assert.equal(typeof data[1][1], "number");
    const invalid = await page.request.get("http://localhost:3000/reports/export?columns=password&format=xlsx");
    assert.equal(invalid.status(), 400);
    const anonymous = await browser.newContext();
    assert.equal((await anonymous.request.get("http://localhost:3000/reports/export?format=xlsx")).status(), 401);
    console.log("Report export browser PASS: independent period/scope/columns, empty selection error, real XLSX download/round-trip and unauthenticated denial.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
