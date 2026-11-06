/**
 * Khai báo kiểu TypeScript cho report-leaderboard.mjs; mô tả đầu vào/kết quả của module
 * JavaScript và cần đồng bộ khi thay đổi API của module đó.
 */

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
