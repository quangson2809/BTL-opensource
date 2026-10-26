import assert from "node:assert/strict";
import { test } from "node:test";

import {
  asRecord,
  errorStringField,
  normalizeOccurredAt,
  normalizeProviderErrorStatus,
  safeLogToken,
} from "../src/lib/safe-error-logging.mjs";

test("shared record and string-field helpers reject malformed provider errors", () => {
  assert.equal(asRecord(null), null);
  assert.equal(asRecord("error"), null);
  assert.deepEqual(asRecord({ code: "invalid_credentials" }), {
    code: "invalid_credentials",
  });
  assert.equal(errorStringField({ code: "invalid_credentials" }, "code"), "invalid_credentials");
  assert.equal(errorStringField({ status: 429 }, "code"), null);
});

test("safe log tokens allow only bounded diagnostic tokens", () => {
  assert.equal(safeLogToken("AuthApiError"), "AuthApiError");
  assert.equal(safeLogToken("  request-123  "), "request-123");
  assert.equal(safeLogToken("secret token"), null);
  assert.equal(safeLogToken("x".repeat(97)), null);
  assert.equal(safeLogToken("x".repeat(128), 128), "x".repeat(128));
  assert.equal(safeLogToken(undefined), null);
});

test("provider error status is restricted to valid HTTP status codes", () => {
  assert.equal(normalizeProviderErrorStatus({ status: 429 }), 429);
  assert.equal(normalizeProviderErrorStatus({ status: 100 }), 100);
  assert.equal(normalizeProviderErrorStatus({ status: 599 }), 599);
  assert.equal(normalizeProviderErrorStatus({ status: 99 }), null);
  assert.equal(normalizeProviderErrorStatus({ status: 600 }), null);
  assert.equal(normalizeProviderErrorStatus({ status: "429" }), null);
  assert.equal(normalizeProviderErrorStatus(null), null);
});

test("occurred-at normalization preserves valid timestamps and replaces invalid input", () => {
  assert.equal(normalizeOccurredAt("2026-10-26T00:00:00.000Z"), "2026-10-26T00:00:00.000Z");
  assert.match(normalizeOccurredAt("not-a-date"), /^\d{4}-\d{2}-\d{2}T/);
  assert.match(normalizeOccurredAt(undefined), /^\d{4}-\d{2}-\d{2}T/);
});
