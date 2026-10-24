import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  classifyOtpDeliveryError,
  createOtpDeliveryFailureLog,
} from "../src/lib/auth-otp-errors.mjs";

test("classifies Supabase email rate limit", () => {
  assert.equal(
    classifyOtpDeliveryError({ code: "over_email_send_rate_limit", status: 429 }),
    "rate-limited",
  );
});

test("classifies recipient authorization errors", () => {
  assert.equal(
    classifyOtpDeliveryError({ code: "email_address_not_authorized", status: 400 }),
    "email-not-authorized",
  );
});

test("classifies invalid redirect errors", () => {
  assert.equal(
    classifyOtpDeliveryError({ message: "Redirect URL is not allowed" }),
    "redirect-invalid",
  );
});

test("classifies SMTP/provider failures", () => {
  assert.equal(
    classifyOtpDeliveryError({ message: "Failed to send email via SMTP", status: 500 }),
    "email-provider",
  );
});

test("falls back safely for unknown errors", () => {
  assert.equal(classifyOtpDeliveryError(new Error("unknown")), "service");
});

test("failure log omits email, OTP, tokens and raw provider message", () => {
  const sensitiveError = {
    code: "over_email_send_rate_limit",
    name: "AuthApiError",
    status: 429,
    message: "email=user@example.com otp=12345678 access_token=secret",
  };
  const entry = createOtpDeliveryFailureLog({
    flow: "password-recovery",
    error: sensitiveError,
    requestId: "req-123",
  });

  assert.equal(entry.category, "rate-limited");
  assert.equal(entry.providerErrorCode, "over_email_send_rate_limit");
  assert.equal(entry.providerStatus, 429);
  assert.equal(JSON.stringify(entry).includes("user@example.com"), false);
  assert.equal(JSON.stringify(entry).includes("12345678"), false);
  assert.equal(JSON.stringify(entry).includes("secret"), false);
  assert.equal(JSON.stringify(entry).includes(sensitiveError.message), false);
});


test("OTP UI and email templates do not claim unverified hosted length or expiry", async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const files = await Promise.all([
    read("../src/app/password/change/page.tsx"),
    read("../src/app/password/recovery/verify/page.tsx"),
    read("../supabase/templates/reauthentication.html"),
    read("../supabase/templates/recovery.html"),
  ]);

  for (const source of files) {
    assert.equal(source.includes("10 phút"), false);
    assert.equal(source.includes("8 số"), false);
  }
  assert.ok(files[0].includes("cấu hình xác thực của hệ thống"));
  assert.ok(files[1].includes("cấu hình xác thực"));
  assert.ok(files[2].includes("thời hạn được cấu hình"));
  assert.ok(files[3].includes("thời hạn được cấu hình"));
});
