export type ReportMetricKey =
  | "customer_count"
  | "activity_count"
  | "connected_customer_count";

export type ReportMetric = {
  key: ReportMetricKey;
  label: string;
  unit: string;
  personal: number;
  team: number;
};

export type ReportRowMetrics = {
  is_self: boolean;
  customer_count: number | string;
  activity_count: number | string;
  connected_customer_count: number | string;
};

export function reportTotals(rows: ReportRowMetrics[]): {
  customer_count: number;
  activity_count: number;
  connected_customer_count: number;
};

export function buildReportComparisonMetrics(rows: ReportRowMetrics[]): ReportMetric[];
