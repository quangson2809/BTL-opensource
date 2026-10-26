/**
 * Aggregate only rows returned by the caller-scoped report_scope RPC.
 * Counts are returned by PostgreSQL as bigint and may arrive as strings.
 */
export function reportTotals(rows) {
  return rows.reduce(
    (sum, row) => ({
      customer_count: sum.customer_count + Number(row.customer_count),
      activity_count: sum.activity_count + Number(row.activity_count),
      connected_customer_count:
        sum.connected_customer_count + Number(row.connected_customer_count),
    }),
    { customer_count: 0, activity_count: 0, connected_customer_count: 0 },
  );
}

/**
 * Build chart series from the exact same scoped rows used by the report table.
 * "Team" means the subordinate rows returned by report_scope, not all users.
 */
export function buildReportComparisonMetrics(rows) {
  const personalRow = rows.find((row) => row.is_self);
  const teamRows = rows.filter((row) => !row.is_self);
  const personal = reportTotals(personalRow ? [personalRow] : []);
  const team = reportTotals(teamRows);

  return [
    {
      key: "customer_count",
      label: "Khách hàng mới",
      unit: "khách hàng",
      personal: personal.customer_count,
      team: team.customer_count,
    },
    {
      key: "activity_count",
      label: "Hoạt động",
      unit: "hoạt động",
      personal: personal.activity_count,
      team: team.activity_count,
    },
    {
      key: "connected_customer_count",
      label: "Lượt khách kết nối",
      unit: "lượt",
      personal: personal.connected_customer_count,
      team: team.connected_customer_count,
    },
  ];
}
