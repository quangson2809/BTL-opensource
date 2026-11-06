import writeExcelFile from "write-excel-file/node";

export const REPORT_COLUMNS = [
  { key: "ho_ten", label: "Nhân sự" }, { key: "ma_dai_ly", label: "Mã đại lý" },
  { key: "scope", label: "Phạm vi" }, { key: "customer_count", label: "Khách hàng mới" },
  { key: "activity_count", label: "Hoạt động" }, { key: "connected_customer_count", label: "Lượt khách kết nối" },
  { key: "range", label: "Khoảng báo cáo" },
];
const numeric = new Set(["customer_count", "activity_count", "connected_customer_count"]);

export function resolveExportOptions(params) {
  const format = params.get("format") ?? "csv";
  const scope = params.get("scope") ?? "all";
  const requested = params.getAll("columns");
  const columns = requested.length || params.get("custom") === "1" ? [...new Set(requested)] : REPORT_COLUMNS.map((column) => column.key);
  if (!["csv", "xlsx"].includes(format) || !["all", "self", "team"].includes(scope) || !columns.length ||
      columns.some((key) => !REPORT_COLUMNS.some((column) => column.key === key))) throw new Error("Invalid export options");
  return { format, scope, columns };
}
export function exportTable(data, rangeLabel, options) {
  if (!Array.isArray(data)) throw new Error("Invalid report data");
  const rows = data.filter((row) => {
    if (!row || typeof row !== "object" || typeof row.is_self !== "boolean") throw new Error("Invalid report row");
    return options.scope === "all" || (options.scope === "self" ? row.is_self : !row.is_self);
  });
  return [options.columns.map((key) => REPORT_COLUMNS.find((column) => column.key === key).label), ...rows.map((row) => options.columns.map((key) => {
    if (key === "range") return rangeLabel;
    if (key === "scope") return row.is_self ? "Cá nhân" : "Cấp dưới";
    if (numeric.has(key)) {
      const value = row[key];
      if (!(typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value)))) throw new Error("Invalid report count");
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number < 0) throw new Error("Invalid report count");
      return number;
    }
    if (typeof row[key] !== "string") throw new Error("Invalid report text");
    return row[key];
  }))];
}
export function tableToCsv(table) {
  const cell = (value) => {
    const text = String(value);
    const safe = typeof value === "string" && /^(?:\s*[=+\-@]|[\t\r])/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + table.map((row) => row.map(cell).join(",")).join("\r\n");
}
export async function tableToXlsx(table) {
  // Explicit String cells keep formula-like user text inert in spreadsheet apps.
  return writeExcelFile(table.map((row, index) => row.map((value) => ({ value, type: typeof value === "number" ? Number : String, fontWeight: index === 0 ? "bold" : undefined }))), { sheet: "IDAILY" }).toBuffer();
}
