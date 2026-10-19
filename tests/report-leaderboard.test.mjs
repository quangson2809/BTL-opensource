import assert from "node:assert/strict";
import { test } from "node:test";

import { rankReportRows } from "../src/lib/report-leaderboard.mjs";

const rows = [
  { account_id: "self", ho_ten: "Current", ma_dai_ly: "SELF", is_self: true, customer_count: 99, activity_count: 99, connected_customer_count: 99 },
  { account_id: "b", ho_ten: "Bình", ma_dai_ly: "B", is_self: false, customer_count: "4", activity_count: "7", connected_customer_count: "10" },
  { account_id: "a", ho_ten: "An", ma_dai_ly: "A", is_self: false, customer_count: "5", activity_count: "7", connected_customer_count: "2" },
  { account_id: "c", ho_ten: "Chi", ma_dai_ly: "C", is_self: false, customer_count: 8, activity_count: 3, connected_customer_count: 1 },
];

test("leaderboard ranks only scoped subordinate rows by activity count", () => {
  const ranked = rankReportRows(rows);
  assert.deepEqual(ranked.map((row) => row.account_id), ["a", "b", "c"]);
  assert.deepEqual(ranked.map((row) => row.rank), [1, 1, 3]);
  assert.equal(ranked[0].customer_count, 5);
  assert.equal(ranked[1].activity_count, 7);
});

test("leaderboard tie ordering is deterministic and excludes the current account", () => {
  const ranked = rankReportRows(rows);
  assert.equal(ranked.some((row) => row.account_id === "self"), false);
  assert.deepEqual(ranked.map((row) => row.ma_dai_ly), ["A", "B", "C"]);
});

test("leaderboard handles empty scope", () => {
  assert.deepEqual(rankReportRows([]), []);
});
