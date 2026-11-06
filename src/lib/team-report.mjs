import { isUuid } from "./input-validation.mjs";

export function parseTeamReportRows(data) {
  if (!Array.isArray(data)) throw new Error("Invalid team report data");
  return data.map((row) => {
    if (!row || typeof row !== "object" || !isUuid(row.team_id) || typeof row.team_name !== "string" || typeof row.team_code !== "string") throw new Error("Invalid team report row");
    const result = { team_id: row.team_id, team_name: row.team_name, team_code: row.team_code };
    for (const key of ["member_count", "customer_count", "activity_count"]) {
      const value = row[key];
      if (!(typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) || !Number.isSafeInteger(Number(value)) || Number(value) < 0) throw new Error("Invalid team report count");
      result[key] = Number(value);
    }
    return result;
  });
}
