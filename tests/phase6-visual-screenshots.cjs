/* eslint @typescript-eslint/no-require-imports: "off" -- CI browser test intentionally uses CommonJS. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("playwright");

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const screenshotPrefix = process.env.PHASE6_SCREENSHOT_PREFIX || "";
const captureOnly = process.env.PHASE6_CAPTURE_ONLY === "true";
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
      ...(captureOnly ? [] : [{ name: "agency-profile", path: "/profile", expectedHeading: "Hồ sơ đại lý" }]),
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
      { width: 1024, height: 900, label: "1024x900" },
      { width: 768, height: 900, label: "768x900" },
      { width: 375, height: 812, label: "375x812" },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of pages) {
        const response = await page.goto(baseURL + route.path, { waitUntil: "domcontentloaded" });
        assert.ok(response?.ok(), route.name + " returned a non-2xx response");
        await page.locator("main h1").first().waitFor();

        // Wait for the reports route to leave its streaming loading boundary before
        // taking screenshots; otherwise fast DOMContentLoaded can capture skeletons.
        if (route.name === "reports") {
          await page.waitForFunction(
            () => {
              const main = document.querySelector("main");
              const hasSummary = Boolean(main?.querySelector(".report-cards h2"));
              const hasChart = Boolean(main?.querySelector("#report-charts-title"));
              const hasEmptyState = [...(main?.querySelectorAll("h2, h3") ?? [])].some((heading) =>
                heading.textContent?.includes("Chưa có dữ liệu biểu đồ"),
              );
              const hasError = Boolean(main?.querySelector('[role="alert"]'));
              return hasSummary || hasChart || hasEmptyState || hasError;
            },
            null,
            { timeout: 20_000 },
          );
        }

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
        const hasHorizontalOverflow =
          layout.documentScrollWidth > layout.viewportWidth + 1 ||
          layout.bodyScrollWidth > layout.viewportWidth + 1;
        if (hasHorizontalOverflow && captureOnly) {
          console.warn(
            "PHASE6_BASELINE_HORIZONTAL_OVERFLOW",
            JSON.stringify({ page: route.name, viewport: viewport.label, ...layout }),
          );
        } else {
          assert.equal(
            hasHorizontalOverflow,
            false,
            route.name + " horizontal overflow at " + viewport.label + ": " + JSON.stringify(layout),
          );
        }
        layouts.push({ page: route.name, viewport: viewport.label, heading, horizontalOverflow: hasHorizontalOverflow });

        if (!captureOnly && route.name === "reports" && viewport.width <= 768) {
          // Personal-only roles (including SA without subordinate scope) correctly
          // hide the team comparison table. Test horizontal scrolling only when that
          // table is present; otherwise assert that the personal chart/empty state
          // is rendered instead of waiting forever for a deliberately hidden table.
          const comparison = page.locator(".report-comparison-scroll");
          if (await comparison.count()) {
            await comparison.waitFor({ state: "visible" });
            const tableWidth = await comparison.evaluate((element) => ({
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
            }));
            assert.ok(
              tableWidth.scrollWidth > tableWidth.clientWidth,
              "report comparison table must scroll within its container at " + viewport.label + ": " + JSON.stringify(tableWidth),
            );
            assert.equal(
              await page.locator(".table-scroll-hint").isVisible(),
              true,
              "mobile report table must display its horizontal-scroll hint at " + viewport.label,
            );
          } else {
            const personalChart = page.locator("#report-charts-title");
            const emptyChart = page.getByText("Chưa có dữ liệu biểu đồ", { exact: false });
            await page.waitForFunction(() =>
              Boolean(document.querySelector("#report-charts-title")) ||
              [...document.querySelectorAll("h2, h3")].some((heading) =>
                heading.textContent?.includes("Chưa có dữ liệu biểu đồ"),
              ) ||
              Boolean(document.querySelector('main [role="alert"]')),
            );
            assert.ok(
              (await personalChart.count()) > 0 || (await emptyChart.count()) > 0,
              "personal-only report must show chart or truthful empty/error state at " + viewport.label,
            );
          }
        }

        await page.screenshot({
          path: path.join("artifacts", "phase6", screenshotPrefix + route.name + "-" + viewport.label + ".png"),
          fullPage: true,
          animations: "disabled",
        });

        // Exercise the authenticated mobile drawer with actual keyboard input.
        // Skip the baseline so this remains a post-fix accessibility gate.
        if (!captureOnly && route.name === "dashboard" && viewport.label === "375x812") {
          const toggle = page.locator(".workspace-menu-toggle");
          await toggle.focus();
          await page.keyboard.press("Enter");
          const sidebar = page.locator("#workspace-sidebar");
          await page.waitForFunction(
            () => document.querySelector("#workspace-sidebar")?.getAttribute("aria-hidden") === "false",
          );
          assert.ok(
            await sidebar.evaluate((element) => element.contains(document.activeElement)),
            "opening the mobile navigation must move focus into the drawer",
          );
          await page.keyboard.press("Escape");
          await page.waitForFunction(
            () => document.querySelector(".workspace-menu-toggle")?.getAttribute("aria-expanded") === "false",
          );
          assert.equal(
            await toggle.evaluate((element) => document.activeElement === element),
            true,
            "closing the mobile navigation with Escape must restore focus to its toggle",
          );
          assert.equal(
            await page.evaluate(() => document.body.style.overflow),
            "",
            "closing the mobile navigation must restore body scrolling",
          );
        }
      }
    }

    if (!captureOnly) {
      // Trigger the real root loading.tsx boundary through a client-side route transition.
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(baseURL + "/phase6-acceptance-loading/start", { waitUntil: "domcontentloaded" });
      await page.getByRole("link", { name: "Open delayed route" }).click();
      const loadingState = page.getByRole("status");
      await loadingState.waitFor();
      assert.equal(await loadingState.getAttribute("aria-busy"), "true");
      assert.ok((await loadingState.innerText()).includes("Đang tải trang"));
      await page.screenshot({
        path: path.join("artifacts", "phase6", screenshotPrefix + "loading-state-375x812.png"),
        fullPage: true,
        animations: "disabled",
      });
  
      for (const viewport of [
        { width: 1440, height: 900, label: "1440x900" },
        { width: 375, height: 812, label: "375x812" },
      ]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(baseURL + "/phase6-acceptance-error", { waitUntil: "domcontentloaded" });
        const errorState = page.getByRole("alert", { name: "Có lỗi xảy ra" });
        await errorState.waitFor();
        await page.getByRole("heading", { name: "Có lỗi xảy ra" }).waitFor();
        await page.getByRole("button", { name: "Thử lại", exact: true }).waitFor();
        await page.screenshot({
          path: path.join("artifacts", "phase6", screenshotPrefix + "error-state-" + viewport.label + ".png"),
          fullPage: true,
          animations: "disabled",
        });
      }
  
  
    }

    console.log(JSON.stringify({
      event: "phase6_visual_acceptance_screenshots_captured",
      sourceSha: process.env.PHASE6_SOURCE_SHA || process.env.GITHUB_SHA || "provided by CI run",
      viewports: ["1440x900", "1024x900", "768x900", "375x812"],
      boundaryStates: ["loading 375x812", "error 1440x900", "error 375x812"],
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
