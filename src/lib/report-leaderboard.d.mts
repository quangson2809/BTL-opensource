export type ReportLeaderboardRow = {
  account_id: string;
  ho_ten: string;
  ma_dai_ly: string;
  is_self: boolean;
  customer_count: number | string;
  activity_count: number | string;
  connected_customer_count: number | string;
};

export type RankedReportRow = ReportLeaderboardRow & {
  rank: number;
};

export function rankReportRows(rows: ReportLeaderboardRow[]): RankedReportRow[];
