import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyLoginAuthError,
  createLoginFailureLog,
  getLoginErrorQueryCode,
  LOGIN_FAILURE_CATEGORIES as CATEGORY,
  TEMPORARY_LOCK_HOOK_MESSAGE,
} from "../src/lib/auth-login-errors.mjs";

test("invalid credentials use one public response for email/password failures", () => {
  const wrongPassword = {
    name: "AuthApiError",
    status: 400,
    code: "invalid_credentials",
    message: "Invalid login credentials",
  };
  const unknownEmail = {
    name: "AuthApiError",
    status: 400,
    code: "invalid_credentials",
    message: "Invalid login credentials",
  };

  assert.equal(classifyLoginAuthError(wrongPassword), CATEGORY.INVALID_CREDENTIALS);
  assert.equal(classifyLoginAuthError(unknownEmail), CATEGORY.INVALID_CREDENTIALS);
  assert.equal(getLoginErrorQueryCode(CATEGORY.INVALID_CREDENTIALS), "invalid");
});

test("email-not-confirmed is classified internally but does not expose account existence", () => {
  const error = {
    name: "AuthApiError",
    status: 400,
    code: "email_not_confirmed",
    message: "Email not confirmed",
  };

  assert.equal(classifyLoginAuthError(error), CATEGORY.EMAIL_NOT_CONFIRMED);
  assert.equal(getLoginErrorQueryCode(CATEGORY.EMAIL_NOT_CONFIRMED), "invalid");
});

test("the exact password-hook lock signal maps to the dedicated temporary-lock message", () => {
  const error = {
    name: "AuthApiError",
    status: 400,
    code: "hook_rejected",
    message: TEMPORARY_LOCK_HOOK_MESSAGE,
  };

  assert.equal(classifyLoginAuthError(error), CATEGORY.TEMPORARY_LOCK);
  assert.equal(getLoginErrorQueryCode(CATEGORY.TEMPORARY_LOCK), "temporary-lock");
});

test("provider rate limits and unknown service failures are not mislabeled as bad credentials", () => {
  assert.equal(
    classifyLoginAuthError({ name: "AuthApiError", status: 429, code: "over_request_rate_limit" }),
    CATEGORY.RATE_LIMITED,
  );
  assert.equal(
    getLoginErrorQueryCode(CATEGORY.RATE_LIMITED),
    "rate-limited",
  );
  assert.equal(
    classifyLoginAuthError({ name: "AuthApiError", status: 503, code: "hook_timeout" }),
    CATEGORY.AUTH_SERVICE_ERROR,
  );
  assert.equal(
    getLoginErrorQueryCode(CATEGORY.AUTH_SERVICE_ERROR),
    "service",
  );
  assert.equal(classifyLoginAuthError(null), CATEGORY.AUTH_SERVICE_ERROR);
});

test("structured login logs include technical metadata but never raw messages or PII", () => {
  const log = createLoginFailureLog({
    category: CATEGORY.AUTH_SERVICE_ERROR,
    source: "supabase-auth",
    requestId: "req-123:zone-a",
    occurredAt: "2026-10-16T14:00:00.000Z",
    error: {
      name: "AuthApiError",
      status: 503,
      code: "hook_timeout",
      message: "Failure for owner@example.com; password=do-not-log",
    },
  });

  assert.deepEqual(log, {
    timestamp: "2026-10-16T14:00:00.000Z",
    event: "auth.login.failed",
    category: "AUTH_SERVICE_ERROR",
    source: "supabase-auth",
    requestId: "req-123:zone-a",
    providerErrorCode: "hook_timeout",
    providerErrorName: "AuthApiError",
    providerErrorStatus: 503,
  });
  const serialized = JSON.stringify(log);
  assert.doesNotMatch(serialized, /owner@example\.com|do-not-log|password|message/i);
  assert.equal(
    createLoginFailureLog({
      category: CATEGORY.INVALID_CREDENTIALS,
      requestId: "id containing spaces",
    }).requestId,
    null,
  );
});
