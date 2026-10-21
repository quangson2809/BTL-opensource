/* eslint @typescript-eslint/no-require-imports: "off" -- CJS is used to resolve Playwright from npm exec in CI. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const draftPrefix = "idaily:form-draft:v2:public-auth:";

async function waitForDraft(page, key, expectedField, expectedValue) {
  await page.waitForFunction(
    ({ key, expectedField, expectedValue }) => {
      const raw = sessionStorage.getItem(key);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return parsed.values?.[expectedField] === expectedValue;
      } catch {
        return false;
      }
    },
    { key, expectedField, expectedValue },
  );
}

async function readDraft(page, key) {
  return page.evaluate((storageKey) => {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, key);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(10_000);
  page.on("pageerror", (error) => console.error("BROWSER_PAGE_ERROR", error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.error("BROWSER_CONSOLE_ERROR", message.text());
  });

  try {
    const responsiveRoutes = [
      { path: "/", hasForm: false },
      { path: "/login", hasForm: true },
      { path: "/register", hasForm: true },
      { path: "/password/recovery", hasForm: true },
      { path: "/password/recovery/verify?email=qa%40example.test&status=otp-sent", hasForm: true },
    ];
    const requiredViewports = [375, 768, 1024, 1440];

    for (const width of requiredViewports) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of responsiveRoutes) {
        await page.goto(baseURL + route.path);
        await page.locator("body").waitFor();
        const layout = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
        }));
        assert.ok(
          layout.documentScrollWidth <= layout.viewportWidth + 1 &&
            layout.bodyScrollWidth <= layout.viewportWidth + 1,
          route.path + " has page-level horizontal overflow at " + width + "px: " + JSON.stringify(layout),
        );

        if (route.hasForm) {
          const unlabeledControls = await page.locator("input:not([type='hidden']), select, textarea").evaluateAll((elements) =>
            elements
              .filter((element) => {
                const control = element;
                return !control.labels?.length &&
                  !control.getAttribute("aria-label") &&
                  !control.getAttribute("aria-labelledby");
              })
              .map((element) => element.outerHTML.slice(0, 160)),
          );
          assert.deepEqual(
            unlabeledControls,
            [],
            route.path + " has input controls without an accessible name at " + width + "px",
          );
        }
      }

      await page.goto(baseURL + "/login");
      // Do not send Tab before the client has hydrated the login form.
      await page.locator('form[data-persist-key="login"][data-draft-persistence-ready="true"]').waitFor();
      await page.keyboard.press("Tab");
      await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body);
      const focusIndicator = await page.evaluate(() => {
        const element = document.activeElement;
        const style = element ? getComputedStyle(element) : null;
        return {
          tagName: element?.tagName,
          outlineStyle: style?.outlineStyle,
          outlineWidth: style?.outlineWidth,
        };
      });
      assert.ok(
        focusIndicator.outlineStyle !== "none" && Number.parseFloat(focusIndicator.outlineWidth ?? "0") >= 2,
        "Keyboard focus indicator must be visible at " + width + "px: " + JSON.stringify(focusIndicator),
      );
    }
    console.log("Responsive browser checks passed at 375/768/1024/1440px: public-route overflow, form accessible names, and keyboard focus.");

    await page.setViewportSize({ width: 1280, height: 720 });
    const loginKey = draftPrefix + "login";
    await page.goto(baseURL + "/login");
    await page.locator('form[data-persist-key="login"][data-draft-persistence-ready="true"]').waitFor();
    await page.locator('input[name="email"]').fill("draft-login@example.test");
    await page.locator('input[name="password"]').fill("LoginSecretForTest123");
    await waitForDraft(page, loginKey, "email", "draft-login@example.test");

    let draft = await readDraft(page, loginKey);
    assert.equal(draft.values.email, "draft-login@example.test");
    assert.equal(JSON.stringify(draft).includes("LoginSecretForTest123"), false);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('input[name="email"]')?.value === "draft-login@example.test");
    assert.equal(await page.locator('input[name="password"]').inputValue(), "");
    await page.locator('form[data-persist-key="login"][data-draft-persistence-ready="true"]').waitFor();

    let interceptedPosts = 0;
    await page.route("**/login", async (route) => {
      if (route.request().method() === "POST") {
        interceptedPosts += 1;
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.abort();
        return;
      }
      await route.continue();
    });
    await page.locator('input[name="email"]').fill("duplicate-test@example.test");
    await page.locator('input[name="password"]').fill("DuplicateSecretForTest123");
    await page.getByRole("button", { name: "Đăng nhập" }).dblclick({ delay: 10 });
    await page.waitForTimeout(800);
    assert.equal(interceptedPosts, 1, "a rapid double-click must issue only one form submission");
    await page.unroute("**/login");

    await page.goto(baseURL + "/login");
    await page.locator('form[data-persist-key="login"][data-draft-persistence-ready="true"]').waitFor();
    await page.locator('input[name="email"]').fill("retry-user@example.test");
    await page.locator('input[name="password"]').fill("WrongPassword123");
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/login" && url.searchParams.has("error"), { timeout: 15_000 }),
      page.getByRole("button", { name: "Đăng nhập" }).click(),
    ]);
    await page.locator('form[data-persist-key="login"][data-draft-persistence-ready="true"]').waitFor();
    await page.waitForFunction(() => document.querySelector('input[name="email"]')?.value === "retry-user@example.test");
    assert.equal(await page.locator('input[name="password"]').inputValue(), "");
    assert.equal(await page.getByRole("button", { name: /Đăng nhập|Đang đăng nhập/ }).isEnabled(), true);

    const registerKey = draftPrefix + "register";
    await page.goto(baseURL + "/register");
    await page.locator('form[data-persist-key="register"][data-draft-persistence-ready="true"]').waitFor();
    await page.locator('input[name="ho_ten"]').fill("Draft User");
    await page.locator('input[name="email"]').fill("draft-register@example.test");
    await page.locator('input[name="so_dien_thoai"]').fill("0900000000");
    await page.locator('input[name="ma_dai_ly"]').fill("DRAFT-SA-001");
    await page.locator('input[name="ma_nguoi_quan_ly"]').fill("DRAFT-DM-001");
    await page.locator('input[name="password"]').fill("RegisterSecretForTest123");
    await waitForDraft(page, registerKey, "email", "draft-register@example.test");

    draft = await readDraft(page, registerKey);
    assert.equal(draft.values.ho_ten, "Draft User");
    assert.equal(JSON.stringify(draft).includes("RegisterSecretForTest123"), false);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('input[name="ho_ten"]')?.value === "Draft User");
    assert.equal(await page.locator('input[name="password"]').inputValue(), "");

    const verifyKey = draftPrefix + "password-recovery-verify";
    await page.goto(baseURL + "/password/recovery/verify?email=otp-user%40example.test&status=otp-sent");
    await page.locator('form[data-persist-key="password-recovery-verify"][data-draft-persistence-ready="true"]').waitFor();
    await page.locator('input[name="otp"]').fill("12345678");
    await page.locator('input[name="new_password"]').fill("RecoverySecretForTest123");
    await page.locator('input[name="confirm_password"]').fill("RecoverySecretForTest123");
    await waitForDraft(page, verifyKey, "email", "otp-user@example.test");

    draft = await readDraft(page, verifyKey);
    assert.equal(draft.values.email, "otp-user@example.test");
    assert.equal(JSON.stringify(draft).includes("12345678"), false);
    assert.equal(JSON.stringify(draft).includes("RecoverySecretForTest123"), false);
    assert.equal(Object.keys(draft.values).some((name) => /password|otp|token|secret/i.test(name)), false);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('input[name="email"]')?.value === "otp-user@example.test");
    assert.equal(await page.locator('input[name="otp"]').inputValue(), "");
    assert.equal(await page.locator('input[name="new_password"]').inputValue(), "");
    assert.equal(await page.locator('input[name="confirm_password"]').inputValue(), "");

    await page.evaluate((prefix) => {
      for (const key of ["login", "register", "password-recovery", "password-recovery-verify"]) {
        sessionStorage.setItem(prefix + key, JSON.stringify({ version: 2, values: { email: "clear@example.test" } }));
      }
    }, draftPrefix);
    await page.goto(baseURL + "/login?status=registered");
    await page.waitForFunction((prefix) => {
      return !Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i))
        .some((key) => key?.startsWith(prefix));
    }, draftPrefix);

    console.log("Form resilience browser checks passed: restore non-sensitive fields, exclude credentials/OTP, and clear auth drafts after success.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
