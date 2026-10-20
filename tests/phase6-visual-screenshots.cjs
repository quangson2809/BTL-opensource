/* eslint @typescript-eslint/no-require-imports: "off" -- CI browser test intentionally uses CommonJS. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("playwright");

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const apiURL = process.env.API_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
const anonKey = process.env.ANON_KEY;

assert.ok(apiURL, "API_URL is required");
assert.ok(serviceRoleKey, "SERVICE_ROLE_KEY is required");
assert.ok(anonKey, "ANON_KEY is required");

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(apiURL, serviceRoleKey, clientOptions);
const suffix = String(Date.now()) + "-" + String(process.pid);
const email = "phase6-visual-" + suffix + "@example.test";
const password = "Phase6VisualPassword1";
const customerName = "Phase 6 Khách hàng kiểm thử";
const agentCode = "P6VIS-" + suffix;
const customerCode = "P6KH-" + suffix;
const phone = "09" + String(Date.now()).slice(-8);
const customerPhone = "08" + String(Date.now() + 1).slice(-8);

function assertNoError(error, context) {
  assert.equal(error, null, context + ": " + (error?.message ?? "unexpected error"));
}

async function insertOne(table, values, context) {
  const { error } = await admin.from(table).insert(values);
  assertNoError(error, context);
}

async function main() {
  fs.mkdirSync(path.join("artifacts", "phase6"), { recursive: true });

  const { data: identity, error: identityError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assertNoError(identityError, "create temporary visual-auth user");
  assert.ok(identity.user, "visual test user must exist");
  const accountId = identity.user.id;

  await insertOne("tai_khoan", {
    id: accountId,
    ho_ten: "Phase 6 Visual Test SA",
    email,
    so_dien_thoai: phone,
    ma_dai_ly: agentCode,
    manager_id: null,
    trang_thai: "DANG_HOAT_DONG",
  }, "create temporary visual account");

  const { data: saRole, error: saRoleError } = await admin
    .from("vai_tro")
    .select("id")
    .eq("ma_vai_tro", "SA")
    .single();
  assertNoError(saRoleError, "resolve SA role");
  assert.ok(saRole?.id, "SA role must exist in the migration catalog");
  await insertOne("phan_cong_vai_tro", {
    tai_khoan_id: accountId,
    vai_tro_id: saRole.id,
  }, "assign SA role to visual account");

  const { data: customer, error: customerError } = await admin
    .from("khach_hang")
    .insert({
      chu_so_huu_id: accountId,
      ma_khach_hang: customerCode,
      ho_ten: customerName,
      so_dien_thoai: customerPhone,
      gioi_tinh: "Nữ",
      ngay_sinh: "1990-01-15",
      dia_chi: "Hà Nội",
      so_thich: "Đọc sách, đi bộ",
      ghi_chu: "Fixture chỉ dùng trong môi trường test Phase 6.",
      loai_khach_hang: "MUC_TIEU",
      tinh_trang: "BẠN",
      nhom_tinh_cach: "D",
    })
    .select("id")
    .single();
  assertNoError(customerError, "create temporary visual customer");
  assert.ok(customer?.id, "visual customer must be created");

  await insertOne("hoat_dong", {
    tai_khoan_id: accountId,
    loai_hoat_dong: "GẶP_GỠ",
    dia_diem: "Hà Nội",
    thoi_gian: new Date().toISOString(),
    so_khach_hang_ket_noi: 1,
  }, "create temporary visual activity");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(15_000);
  page.on("pageerror", (error) => console.error("PHASE6_VISUAL_PAGE_ERROR", error.stack || error.message));

  try {
    await page.goto(baseURL + "/login", { waitUntil: "domcontentloaded" });
    await page.locator('form[data-persist-key="login"][data-draft-persistence-ready="true"]').waitFor();
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 20_000 });

    const pages = [
      { name: "dashboard", path: "/dashboard", expectedHeading: "Xin chào," },
      { name: "customer-list", path: "/customers", expectedHeading: "Khách hàng" },
      { name: "customer-detail", path: "/customers/" + customer.id, expectedHeading: customerName },
      { name: "customer-form", path: "/customers/new", expectedHeading: "Thêm khách hàng" },
      { name: "reports", path: "/reports", expectedHeading: "Báo cáo & thống kê" },
      {
        name: "customer-list-empty",
        path: "/customers?q=phase6empty" + suffix.replace(/[^a-z0-9]/gi, ""),
        expectedHeading: "Khách hàng",
        expectedText: "Không tìm thấy kết quả",
      },
    ];

    const layouts = [];
    for (const viewport of [
      { width: 1440, height: 900, label: "1440x900" },
      { width: 375, height: 812, label: "375x812" },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of pages) {
        const response = await page.goto(baseURL + route.path, { waitUntil: "domcontentloaded" });
        assert.ok(response?.ok(), route.name + " returned a non-2xx response");
        await page.locator("main h1").first().waitFor();

        const heading = (await page.locator("main h1").first().innerText()).trim();
        assert.ok(
          heading.includes(route.expectedHeading),
          route.name + " heading mismatch at " + viewport.label + ": " + heading,
        );
        if (route.expectedText) {
          await page.getByText(route.expectedText, { exact: false }).waitFor();
        }

        const layout = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
        }));
        assert.ok(
          layout.documentScrollWidth <= layout.viewportWidth + 1 &&
            layout.bodyScrollWidth <= layout.viewportWidth + 1,
          route.name + " horizontal overflow at " + viewport.label + ": " + JSON.stringify(layout),
        );
        layouts.push({ page: route.name, viewport: viewport.label, heading });

        await page.screenshot({
          path: path.join("artifacts", "phase6", route.name + "-" + viewport.label + ".png"),
          fullPage: true,
          animations: "disabled",
        });
      }
    }

    console.log(JSON.stringify({
      event: "phase6_visual_acceptance_screenshots_captured",
      sourceSha: process.env.GITHUB_SHA || "provided by CI run",
      viewports: ["1440x900", "375x812"],
      pages: layouts,
      screenshotDirectory: "artifacts/phase6",
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("PHASE6_VISUAL_ACCEPTANCE_FAILED", error.stack || error.message);
  process.exitCode = 1;
});
