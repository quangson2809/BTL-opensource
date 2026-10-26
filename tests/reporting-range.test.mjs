import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveReportRange } from "../src/lib/reporting.ts";

test("daily report uses Vietnam-local midnight boundaries", () => {
  const range = resolveReportRange("day", "2026-10-26");
  assert.equal(range.period, "day");
  assert.equal(range.anchor, "2026-10-26");
  assert.equal(range.start, "2026-10-25T17:00:00.000Z");
  assert.equal(range.end, "2026-10-26T17:00:00.000Z");
  assert.equal(range.label, "Ngày 2026-10-26");
});

test("weekly report starts on Monday and uses an exclusive next-Monday boundary", () => {
  const range = resolveReportRange("week", "2026-10-28");
  assert.equal(range.anchor, "2026-10-28");
  assert.equal(range.start, "2026-10-25T17:00:00.000Z");
  assert.equal(range.end, "2026-11-01T17:00:00.000Z");
  assert.equal(range.label, "Tuần từ 2026-10-26");
});

test("monthly report spans the complete Vietnam-local calendar month", () => {
  const range = resolveReportRange("month", "2026-10-15");
  assert.equal(range.start, "2026-09-30T17:00:00.000Z");
  assert.equal(range.end, "2026-10-31T17:00:00.000Z");
  assert.equal(range.label, "Tháng 10/2026");
});

test("invalid periods and impossible anchor dates fail closed to a valid default range", () => {
  const range = resolveReportRange("year", "2026-02-30");
  assert.equal(range.period, "day");
  assert.match(range.anchor, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Date.parse(range.start) < Date.parse(range.end));
  assert.equal(range.end, new Date(Date.parse(range.start) + 24 * 60 * 60 * 1000).toISOString());
});
