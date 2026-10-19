/* eslint @typescript-eslint/no-require-imports: "off" -- CJS is used to resolve Playwright from npm exec in CI. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
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

  try {
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
