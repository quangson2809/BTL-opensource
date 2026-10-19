/**
 * Rank only subordinate rows already returned by the caller-scoped report RPC.
 * Activity count is the explicit ranking metric; customer count is displayed
 * for context and used only to make ordering within a tie deterministic.
 */
export function rankReportRows(rows) {
  const subordinateRows = rows
    .filter((row) => !row.is_self)
    .map((row) => ({
      ...row,
      customer_count: Number(row.customer_count),
      activity_count: Number(row.activity_count),
      connected_customer_count: Number(row.connected_customer_count),
    }))
    .sort((left, right) =>
      right.activity_count - left.activity_count ||
      right.customer_count - left.customer_count ||
      left.ho_ten.localeCompare(right.ho_ten, "vi") ||
      left.account_id.localeCompare(right.account_id),
    );

  let previousActivityCount = null;
  let currentRank = 0;

  return subordinateRows.map((row, index) => {
    if (previousActivityCount !== row.activity_count) {
      currentRank = index + 1;
      previousActivityCount = row.activity_count;
    }

    return { ...row, rank: currentRank };
  });
}
