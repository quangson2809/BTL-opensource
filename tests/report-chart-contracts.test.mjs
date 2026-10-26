import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("report table and charts share the caller-scoped RPC result and selected date range", async () => {
  const page = await readSource("../src/app/reports/page.tsx");

  assert.ok(page.includes('supabase.rpc("report_scope"'));
  assert.ok(page.includes("period_start: range.start"));
  assert.ok(page.includes("period_end: range.end"));
  assert.ok(page.includes("const rows = (data ?? []) as ReportRow[]"));
  assert.ok(page.includes("buildReportComparisonMetrics(rows)"));
  assert.ok(page.includes("rows.map((row) => ("));
  assert.ok(page.includes('name="period"') && page.includes('name="anchor"'));
  assert.ok(page.includes("hasTeamRows={teamRows.length > 0}"));
});

test("report route exposes loading, recoverable error, and accessible chart labels", async () => {
  const [loading, error, page] = await Promise.all([
    readSource("../src/app/reports/loading.tsx"),
    readSource("../src/app/reports/error.tsx"),
    readSource("../src/app/reports/page.tsx"),
  ]);

  assert.ok(loading.includes('aria-busy="true"') && loading.includes('role="status"'));
  assert.ok(error.includes('role="alert"') && error.includes("onClick={reset}"));
  assert.ok(page.includes('aria-labelledby="report-charts-title"'));
  assert.ok(page.includes('aria-label={`${bar.label}: ${formatCount(bar.value)} ${metric.unit}`}'));
  assert.ok(page.includes('aria-label="Chú giải biểu đồ"'));
});

test("report UI does not claim daily trend buckets absent from the aggregate RPC contract", async () => {
  const page = await readSource("../src/app/reports/page.tsx");
  assert.ok(page.includes("Mỗi thanh biểu thị tổng của khoảng ngày/tuần/tháng đang chọn"));
  assert.ok(page.includes("không tự tạo các mốc thời gian không có trong hợp đồng dữ liệu"));
});
