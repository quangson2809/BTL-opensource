export type TeamReportRow = { team_id: string; team_name: string; team_code: string; member_count: number; customer_count: number; activity_count: number };
export function parseTeamReportRows(data: unknown): TeamReportRow[];
