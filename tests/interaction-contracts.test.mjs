import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getSubmitPresentation,
  resolveActionFeedback,
  shouldCancelSubmission,
} from "../src/lib/interaction-contracts.mjs";
import {
  isUuid,
  isValidDateOnly,
  parseNonNegativeInt32,
  parseVietnamLocalDateTime,
} from "../src/lib/input-validation.mjs";
import {
  buildFilterHref,
  parsePositivePage,
  sanitizePostgrestOrSearch,
} from "../src/lib/list-query.mjs";

test("feedback maps known error codes to safe messages", () => {
  const result = resolveActionFeedback({ error: "delete" });
  assert.equal(result.kind, "error");
  assert.match(result.message, /Không thể xóa bản ghi/);
  assert.doesNotMatch(result.message, /postgres|supabase|sql/i);
});

test("unknown error codes use safe fallback and override success status", () => {
  assert.deepEqual(resolveActionFeedback({ error: "provider-secret", status: "created" }), {
    kind: "error",
    message: "Không thể xử lý yêu cầu. Vui lòng thử lại.",
  });
});

test("unknown status codes never show false success", () => {
  assert.equal(resolveActionFeedback({ status: "unknown-status" }), null);
  assert.equal(resolveActionFeedback({}), null);
});

test("pending submit presentation disables the control and changes its label", () => {
  assert.deepEqual(getSubmitPresentation(true, "Đang lưu…", "Lưu"), {
    disabled: true,
    label: "Đang lưu…",
  });
  assert.deepEqual(getSubmitPresentation(false, "Đang lưu…", "Lưu"), {
    disabled: false,
    label: "Lưu",
  });
});

test("confirmation cancellation blocks submission; acceptance and no-confirmation do not", () => {
  let prompted = "";
  assert.equal(shouldCancelSubmission("Xóa bản ghi?", (message) => {
    prompted = message;
    return false;
  }), true);
  assert.equal(prompted, "Xóa bản ghi?");
  assert.equal(shouldCancelSubmission("Xóa bản ghi?", () => true), false);
  assert.equal(shouldCancelSubmission(undefined, () => {
    assert.fail("Confirmation must not be called when no message is configured");
  }), false);
});

test("UUID input validation accepts canonical IDs and rejects malformed values", () => {
  assert.equal(isUuid("81a3e6e8-11db-4bce-9b2e-b8ad6ac86df1"), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid(""), false);
});

test("date validation rejects impossible calendar dates", () => {
  assert.equal(isValidDateOnly("2024-02-29"), true);
  assert.equal(isValidDateOnly("2025-02-29"), false);
  assert.equal(isValidDateOnly("2025-13-01"), false);
  assert.equal(isValidDateOnly("2025-1-01"), false);
});

test("numeric validation accepts only non-negative PostgreSQL integer values", () => {
  assert.equal(parseNonNegativeInt32("0"), 0);
  assert.equal(parseNonNegativeInt32("0012"), 12);
  assert.equal(parseNonNegativeInt32("-1"), null);
  assert.equal(parseNonNegativeInt32("1.5"), null);
  assert.equal(parseNonNegativeInt32("1e3"), null);
  assert.equal(parseNonNegativeInt32("2147483648"), null);
});

test("Vietnam-local date time requires a valid date and exact minute format", () => {
  assert.equal(parseVietnamLocalDateTime("2026-10-16T20:24"), "2026-10-16T13:24:00.000Z");
  assert.equal(parseVietnamLocalDateTime("2026-02-30T12:00"), null);
  assert.equal(parseVietnamLocalDateTime("2026-10-16T24:00"), null);
  assert.equal(parseVietnamLocalDateTime("2026-10-16T12:60"), null);
  assert.equal(parseVietnamLocalDateTime("2026-10-16T12:00:30"), null);
});

test("list query parsing fails closed for unsafe search syntax and malformed pages", () => {
  const sanitized = sanitizePostgrestOrSearch("Tên,(mã).%_\\ OR true");
  assert.doesNotMatch(sanitized, /[^\p{L}\p{N}\s@+-]/u);
  assert.match(sanitized, /Tên/);
  assert.equal(parsePositivePage(undefined), 1);
  assert.equal(parsePositivePage("3"), 3);
  assert.equal(parsePositivePage("0"), 1);
  assert.equal(parsePositivePage("-3"), 1);
  assert.equal(parsePositivePage("2abc"), 1);
  assert.equal(parsePositivePage("9007199254740992"), 1);
});


test("removing one active list filter preserves the others and resets pagination", () => {
  assert.equal(
    buildFilterHref("/customers", { q: "an", loai: "MUC_TIEU", page: "4" }, "loai"),
    "/customers?q=an",
  );
  assert.equal(
    buildFilterHref("/notifications", { q: "họp nhóm", trang_thai: "ĐÃ_GỬI", page: "2" }, "q"),
    "/notifications?trang_thai=%C4%90%C3%83_G%E1%BB%ACI",
  );
  assert.equal(
    buildFilterHref("/activities", { q: "", loai: "" }, "loai"),
    "/activities",
  );
});
