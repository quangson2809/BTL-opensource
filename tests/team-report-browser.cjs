/* eslint @typescript-eslint/no-require-imports: "off" -- CJS Playwright runner. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { readSheet } = require("read-excel-file/node");
const { fixture, login, setup } = require("./browser-fixtures.cjs");

(async () => {
  const dm = await fixture("DM");
  const umA = await fixture("UM", dm.id);
  const umB = await fixture("UM", dm.id);
  const nested = await fixture("UM", umA.id);
  const sa = await fixture("SA", nested.id);
  for (const owner of [sa, umB]) assert.equal((await setup.from("hoat_dong").insert({ tai_khoan_id: owner.id, loai_hoat_dong: "TƯ_VẤN", dia_diem: "Team browser", thoi_gian: new Date().toISOString(), so_khach_hang_ket_noi: 1 })).error, null);
  const anchor = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const url = `http://localhost:3000/reports?period=month&anchor=${anchor}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage();
    await login(page, dm);
    await page.goto(url);
    const table = page.getByRole("table", { name: "So sánh nhóm UM", exact: true });
    await table.waitFor();
    assert.equal(await table.getByRole("row").count(), 3);
    assert.equal(await table.getByRole("row").filter({ hasText: umA.name }).getByRole("cell").nth(2).textContent(), "3");
    assert.equal((await table.textContent()).includes(nested.name), false);
    const downloaded = page.waitForEvent("download");
    await page.getByRole("link", { name: "Xuất so sánh nhóm (.xlsx)", exact: true }).click();
    const data = await readSheet(await (await downloaded).path());
    assert.equal(data.length, 3);
    assert.deepEqual(data.slice(1).map((row) => row[0]).sort(), [umA.name, umB.name].sort());
    for (const user of [umA, sa]) {
      const scoped = await browser.newPage();
      await login(scoped, user);
      await scoped.goto(url);
      if (user === umA) {
        await scoped.getByRole("table", { name: "So sánh nhóm UM", exact: true }).waitFor();
        assert.equal(await scoped.getByRole("table", { name: "So sánh nhóm UM", exact: true }).getByRole("row").count(), 2);
      }
      else {
        assert.equal(await scoped.getByRole("table", { name: "So sánh nhóm UM", exact: true }).count(), 0);
        assert.equal((await scoped.request.get(`http://localhost:3000/reports/export?dataset=teams&format=xlsx&period=month&anchor=${anchor}`)).status(), 403);
      }
    }
    console.log("Team report browser PASS: disjoint groups, nested UM counted once, scoped Excel, UM own group and SA denial.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
