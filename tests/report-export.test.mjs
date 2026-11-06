import assert from "node:assert/strict";
import { test } from "node:test";
import { readSheet } from "read-excel-file/node";
import { resolveExportOptions, exportTable, tableToCsv, tableToXlsx } from "../src/lib/report-export.mjs";

const rows = [
  { ho_ten: "Nguyễn Ánh", ma_dai_ly: "SA_01", is_self: true, customer_count: "2", activity_count: 3, connected_customer_count: 4 },
  { ho_ten: "=SUM(1,1)", ma_dai_ly: "SA_02", is_self: false, customer_count: 5, activity_count: 6, connected_customer_count: 7 },
];
test("export options preserve legacy CSV and reject unknown/empty selections", () => {
  assert.equal(resolveExportOptions(new URLSearchParams()).format, "csv");
  for (const query of ["format=pdf", "scope=anyone", "columns=password", "custom=1"]) assert.throws(() => resolveExportOptions(new URLSearchParams(query)));
});
test("scope and column selection retain numeric types and safe values", () => {
  const options = resolveExportOptions(new URLSearchParams("format=xlsx&scope=self&columns=ho_ten&columns=customer_count"));
  assert.deepEqual(exportTable(rows, "Ngày", options), [["Nhân sự", "Khách hàng mới"], ["Nguyễn Ánh", 2]]);
  assert.throws(() => exportTable([{ ...rows[0], customer_count: "9007199254740993" }], "Ngày", options));
});
test("Excel round trip preserves Vietnamese, numbers and inert formula-like strings", async () => {
  const options = resolveExportOptions(new URLSearchParams("format=xlsx&columns=ho_ten&columns=activity_count"));
  const table = exportTable(rows, "Ngày", options);
  assert.deepEqual(await readSheet(await tableToXlsx(table)), table);
  const empty = exportTable([], "Ngày", options);
  assert.deepEqual(await readSheet(await tableToXlsx(empty)), empty);
});
test("CSV quotes text and neutralizes formula prefixes including whitespace", () => {
  const csv = tableToCsv([["Tiếng Việt", '=SUM(1,1)', '  +1', 'a"b', 3]]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=SUM(1,1)"'));
  assert.ok(csv.includes('"\'  +1"'));
  assert.ok(csv.includes('"a""b"'));
});
