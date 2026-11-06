import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTeamReportRows } from "../src/lib/team-report.mjs";
import { exportTable, resolveExportOptions, tableToXlsx } from "../src/lib/report-export.mjs";
import { readSheet } from "read-excel-file/node";

const row = { team_id: "e9000000-0000-4000-8000-000000000001", team_name: "Nhóm Ánh", team_code: "UM_01", member_count: "3", customer_count: 2, activity_count: "4" };
test("team report boundary normalizes bigint strings and rejects malformed counts", () => {
  assert.equal(parseTeamReportRows([row])[0].member_count, 3);
  for (const value of [null, [{ ...row, team_id: "bad" }], [{ ...row, member_count: "NaN" }], [{ ...row, activity_count: -1 }]]) assert.throws(() => parseTeamReportRows(value));
});
test("team export uses its own allowed columns and round trips to Excel", async () => {
  const options = resolveExportOptions(new URLSearchParams("dataset=teams&format=xlsx"));
  const table = exportTable([row], "Tháng 11/2026", options);
  assert.deepEqual(await readSheet(await tableToXlsx(table)), table);
  assert.equal(table[1][2], 3);
  assert.throws(() => resolveExportOptions(new URLSearchParams("dataset=teams&scope=self")));
  assert.throws(() => resolveExportOptions(new URLSearchParams("dataset=teams&columns=ho_ten")));
});
