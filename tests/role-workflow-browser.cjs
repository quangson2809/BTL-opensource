/* eslint @typescript-eslint/no-require-imports: "off" -- CJS Playwright runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const { fixture, login, setup } = require("./browser-fixtures.cjs");

const base = process.env.E2E_BASE_URL || "http://localhost:3000";
const client = () => createClient(process.env.API_URL, process.env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

(async () => {
  const admin = await fixture("ADMIN");
  const dm = await fixture("DM");
  const um = await fixture("UM", dm.id);
  const sa = await fixture("SA", um.id);
  const adminCaller = client();
  const dmCaller = client();
  assert.equal((await adminCaller.auth.signInWithPassword(admin)).error, null);
  assert.equal((await dmCaller.auth.signInWithPassword(dm)).error, null);
  const role = (await setup.from("vai_tro").select("id,ten_vai_tro,mo_ta").eq("ma_vai_tro", "DM").single()).data;
  const mapping = await setup.from("phan_quyen_vai_tro").select("quyen_id").eq("vai_tro_id", role.id);
  assert.equal(mapping.error, null);
  const originalPermissions = mapping.data.map((row) => row.quyen_id);
  const notificationPermission = (await setup.from("quyen").select("id").eq("ma_quyen", "NOTIFICATION_MANAGE").single()).data.id;
  const setPermissions = (ids) => adminCaller.rpc("admin_update_role", { target_role_id: role.id, role_name: role.ten_vai_tro, role_description: role.mo_ta, permission_ids: ids });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  let permissionsChanged = false;
  const artifactDir = process.env.E2E_ARTIFACT_DIR || "/tmp/idaily-role-e2e";
  await fs.mkdir(artifactDir, { recursive: true });
  try {
    const pages = {};
    const routes = {
      ADMIN: { user: admin, allowed: ["/dashboard", "/admin/accounts", "/admin/accounts/new", "/admin/roles", "/profile", "/reports"], denied: ["/personnel", "/notifications/new"] },
      DM: { user: dm, allowed: ["/dashboard", "/customers", "/activities", "/personnel", "/notifications/new", "/reports"], denied: ["/admin/accounts"] },
      UM: { user: um, allowed: ["/dashboard", "/personnel", "/activities", "/reports", "/profile"], denied: ["/admin/accounts", "/notifications/new"] },
      SA: { user: sa, allowed: ["/dashboard", "/customers", "/activities", "/notifications", "/reports/export-options", "/profile"], denied: ["/personnel", "/admin/accounts", "/notifications/new"] },
    };
    for (const [name, config] of Object.entries(routes)) {
      const page = await browser.newPage();
      pages[name] = page;
      await login(page, config.user);
      for (const route of config.allowed) {
        await page.goto(base + route);
        await page.locator("main h1").first().waitFor();
        await page.locator('.account-summary[aria-busy="false"]').waitFor({ state: "attached" });
        assert.ok((await page.locator(".account-summary").textContent()).includes(config.user.email), `${name} account header loads its own identity`);
        assert.equal(new URL(page.url()).pathname, route);
        assert.equal(await page.locator(".error-state, .message.error, .account-context-error").count(), 0, `${name} ${route} has no error fallback`);
      }
      for (const route of config.denied) {
        await page.goto(base + route);
        await page.waitForURL("**/access-denied");
      }
      for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base + "/dashboard");
        await page.locator("main h1").first().waitFor();
        await page.locator('.account-summary[aria-busy="false"]').waitFor({ state: "attached" });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} dashboard overflow at ${width}`);
        await page.screenshot({ path: `${artifactDir}/${name}-${width}.png`, fullPage: true });
      }
      console.log(`${name} route allow/deny and four responsive widths PASS`);
    }

    const saPage = pages.SA;
    await saPage.goto(base + "/customers/new");
    await saPage.locator('form[data-draft-persistence-ready="true"]').waitFor();
    const suffix = Date.now();
    const customerName = `Khách E2E ${suffix}`;
    const address = `Hà Nội (E2E) ${suffix}`;
    for (const [name, value] of Object.entries({ ho_ten: customerName, so_dien_thoai: "05" + String(suffix).slice(-8), gioi_tinh: "Nữ", ngay_sinh: "1990-01-01", dia_chi: address, so_thich: "Sách", ghi_chu: "E2E fixture" })) await saPage.locator(`[name="${name}"]`).fill(value);
    await saPage.getByRole("button", { name: "Lưu khách hàng", exact: true }).click();
    await saPage.waitForURL(/\/customers\/[a-f0-9-]+\?status=created/);
    const customerPath = new URL(saPage.url()).pathname;
    assert.match(await saPage.locator("main").textContent(), /KH-\d{6,}/);
    await saPage.goto(base + "/customers?q=" + encodeURIComponent(address) + "&gioi_tinh=" + encodeURIComponent("Nữ"));
    await saPage.getByText(customerName, { exact: true }).waitFor();
    await pages.DM.goto(base + customerPath);
    await pages.DM.getByRole("heading", { name: "Không tìm thấy trang hoặc bản ghi", exact: true }).waitFor();
    await saPage.goto(base + customerPath);
    saPage.once("dialog", (dialog) => dialog.dismiss());
    await saPage.getByRole("button", { name: "Xóa khách hàng", exact: true }).click();
    assert.equal(new URL(saPage.url()).pathname, customerPath);
    saPage.once("dialog", (dialog) => dialog.accept());
    await saPage.getByRole("button", { name: "Xóa khách hàng", exact: true }).click();
    await saPage.waitForURL("**/customers?status=deleted");

    await pages.ADMIN.goto(base + "/admin/accounts?q=" + encodeURIComponent(sa.email));
    await pages.ADMIN.locator("article.record-row").filter({ hasText: sa.name }).waitFor();
    assert.equal(await pages.ADMIN.locator("article.record-row").count(), 1);

    const dmPage = pages.DM;
    await dmPage.goto(base + "/notifications/new");
    await dmPage.locator('form[data-draft-persistence-ready="true"]').waitFor();
    const title = `Notification E2E ${suffix}`;
    await dmPage.locator('[name="tieu_de"]').fill(title);
    await dmPage.locator('[name="noi_dung"]').fill("Delivery and revocation test");
    await dmPage.locator(`input[name="recipient_ids"][value="${sa.id}"]`).check();
    await dmPage.getByRole("button", { name: "Tạo bản nháp", exact: true }).click();
    await dmPage.waitForURL(/\/notifications\?status=created/);
    const draftId = new URL(dmPage.url()).searchParams.get("id");
    assert.ok(draftId);
    assert.equal((await setPermissions(originalPermissions.filter((id) => id !== notificationPermission))).error, null);
    permissionsChanged = true;
    const denied = await dmCaller.rpc("dm_delete_notification_draft", { target_notification_id: draftId });
    assert.equal(denied.error?.code, "42501");
    const deniedUpdate = await dmCaller.rpc("dm_update_notification_draft", { target_notification_id: draftId, notification_title: "Bypassed", notification_content: "Denied", notification_type: "TIN_TỨC", recipient_ids: [sa.id] });
    assert.equal(deniedUpdate.error?.code, "42501");
    await dmPage.reload();
    await dmPage.getByRole("heading", { name: "Thông báo", exact: true }).waitFor();
    assert.equal(await dmPage.getByRole("link", { name: "Tạo thông báo", exact: true }).count(), 0);
    assert.equal(await dmPage.getByRole("button", { name: "Gửi thông báo", exact: true }).count(), 0);
    assert.equal((await setPermissions(originalPermissions)).error, null);
    permissionsChanged = false;
    await dmPage.reload();
    dmPage.once("dialog", (dialog) => dialog.accept());
    await dmPage.getByRole("button", { name: "Gửi thông báo", exact: true }).click();
    await dmPage.waitForURL("**/notifications?status=sent");
    await saPage.goto(base + "/notifications");
    await saPage.getByText(title, { exact: true }).waitFor();
    await saPage.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }).click();
    await saPage.waitForURL("**/notifications?status=read");
    const read = await setup.from("thong_bao_nguoi_nhan").select("da_doc").eq("thong_bao_id", draftId).eq("tai_khoan_id", sa.id).single();
    assert.equal(read.data.da_doc, true);
    assert.equal((await setup.from("tai_khoan").update({ trang_thai: "KHOA" }).eq("id", sa.id)).error, null);
    await saPage.goto(base + "/customers");
    await saPage.waitForURL(/\/(access-denied|login)(\?|$)/);

    for (const state of ["CHO_PHE_DUYET", "KHOA"]) {
      const user = await fixture("SA");
      assert.equal((await setup.from("tai_khoan").update({ trang_thai: state }).eq("id", user.id)).error, null);
      const page = await browser.newPage();
      await page.goto(base + "/login");
      await page.locator('form[data-draft-persistence-ready="true"]').waitFor();
      await page.locator('[name="email"]').fill(user.email);
      await page.locator('[name="password"]').fill(user.password);
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await page.waitForURL(state === "KHOA" ? "**/login?error=locked" : "**/login?error=pending");
    }
    console.log("Role workflow browser PASS: customer ownership/search/delete confirmation, full-email search, notification create/revoke/direct RPC deny/send/read, live lock and pending/locked login gates.");
  } finally {
    try { if (permissionsChanged) assert.equal((await setPermissions(originalPermissions)).error, null); }
    finally { await browser.close(); }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
