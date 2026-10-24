import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildReportComparisonMetrics,
  reportTotals,
} from "../src/lib/report-metrics.mjs";

const rows = [
  {
    is_self: true,
    customer_count: "2",
    activity_count: "3",
    connected_customer_count: "5",
  },
  {
    is_self: false,
    customer_count: "4",
    activity_count: "7",
    connected_customer_count: "10",
  },
  {
    is_self: false,
    customer_count: 6,
    activity_count: 2,
    connected_customer_count: 1,
  },
];

test("report totals normalize PostgreSQL bigint strings and match row sums", () => {
  assert.deepEqual(reportTotals(rows), {
    customer_count: 12,
    activity_count: 12,
    connected_customer_count: 16,
  });
});

test("chart comparison uses self row and only the scoped subordinate rows", () => {
  assert.deepEqual(buildReportComparisonMetrics(rows), [
    {
      key: "customer_count",
      label: "Khách hàng mới",
      unit: "khách hàng",
      personal: 2,
      team: 10,
    },
    {
      key: "activity_count",
      label: "Hoạt động",
      unit: "hoạt động",
      personal: 3,
      team: 9,
    },
    {
      key: "connected_customer_count",
      label: "Lượt khách kết nối",
      unit: "lượt",
      personal: 5,
      team: 11,
    },
  ]);
});

test("empty scope yields zero-valued metrics without inventing rows", () => {
  assert.deepEqual(buildReportComparisonMetrics([]), [
    { key: "customer_count", label: "Khách hàng mới", unit: "khách hàng", personal: 0, team: 0 },
    { key: "activity_count", label: "Hoạt động", unit: "hoạt động", personal: 0, team: 0 },
    { key: "connected_customer_count", label: "Lượt khách kết nối", unit: "lượt", personal: 0, team: 0 },
  ]);
});
