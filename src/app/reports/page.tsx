import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

import { requireBusinessAccount } from "@/lib/business";
import { resolveReportRange } from "@/lib/reporting";
import { rankReportRows } from "@/lib/report-leaderboard.mjs";

export const dynamic = "force-dynamic";

type ReportRow = {
  account_id: string;
  ho_ten: string;
  ma_dai_ly: string;
  is_self: boolean;
  customer_count: number;
  activity_count: number;
  connected_customer_count: number;
};

type ReportsPageProps = {
  searchParams: Promise<{ period?: string; anchor?: string }>;
};

function totals(rows: ReportRow[]) {
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

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const query = await searchParams;
  const range = resolveReportRange(query.period, query.anchor);
  const { supabase } = await requireBusinessAccount();
  const { data, error } = await supabase.rpc("report_scope", {
    period_start: range.start,
    period_end: range.end,
  });

  if (error) {
    throw new Error("Không thể tải báo cáo trong scope hiện tại.");
  }

  const rows = (data ?? []) as ReportRow[];
  const personal = rows.find((row) => row.is_self);
  const teamRows = rows.filter((row) => !row.is_self);
  const leaderboard = rankReportRows(teamRows);
  const team = totals(teamRows);
  const overview = totals(rows);
  const exportQuery = new URLSearchParams({
    period: range.period,
    anchor: range.anchor,
  }).toString();

  return (
    <main>
      <section className="card wide-card">
        <PageHeader
          title="Báo cáo & thống kê"
          description="Theo dõi kết quả cá nhân và nhóm trong phạm vi dữ liệu được cấp quyền."
          actions={
            <>
              <Link className="button-link button-secondary" href="/dashboard">
                Dashboard
              </Link>
              <Link className="button-link" href={`/reports/export?${exportQuery}`}>
                Xuất Excel (.csv)
              </Link>
            </>
          }
        />

        <form className="filter-grid" method="get">
          <label>
            Khoảng thời gian
            <select defaultValue={range.period} name="period">
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
            </select>
          </label>
          <label>
            Ngày tham chiếu
            <input defaultValue={range.anchor} name="anchor" type="date" />
          </label>
          <button type="submit">Xem báo cáo</button>
        </form>

        <p className="secondary-text">{range.label}</p>

        <div className="report-cards">
          <article className="card">
            <h2>Cá nhân</h2>
            <p>Khách hàng mới: {personal?.customer_count ?? 0}</p>
            <p>Hoạt động: {personal?.activity_count ?? 0}</p>
            <p>
              Lượt khách kết nối: {personal?.connected_customer_count ?? 0}
            </p>
          </article>
          <article className="card">
            <h2>Nhóm cấp dưới</h2>
            <p>Khách hàng mới: {team.customer_count}</p>
            <p>Hoạt động: {team.activity_count}</p>
            <p>Lượt khách kết nối: {team.connected_customer_count}</p>
          </article>
          <article className="card">
            <h2>Tổng quan scope</h2>
            <p>Khách hàng mới: {overview.customer_count}</p>
            <p>Hoạt động: {overview.activity_count}</p>
            <p>Lượt khách kết nối: {overview.connected_customer_count}</p>
          </article>
        </div>

        {leaderboard.length > 0 ? (
          <section aria-labelledby="report-leaderboard-title">
            <h2 id="report-leaderboard-title">Xếp hạng nhân sự theo số hoạt động</h2>
            <p className="secondary-text">
              Xếp hạng trong phạm vi cấp dưới mà tài khoản hiện tại được phép xem, theo {range.label.toLowerCase()}.
              Nhân sự có cùng số hoạt động được đồng hạng; số khách hàng dùng để sắp xếp ổn định trong nhóm đồng hạng.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Hạng</th>
                    <th scope="col">Nhân sự</th>
                    <th scope="col">Mã đại lý</th>
                    <th scope="col">Hoạt động</th>
                    <th scope="col">Khách hàng mới</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr key={row.account_id}>
                      <td>{row.rank}</td>
                      <td>{row.ho_ten}</td>
                      <td>{row.ma_dai_ly}</td>
                      <td>{row.activity_count}</td>
                      <td>{row.customer_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <EmptyState
            title="Chưa có dữ liệu xếp hạng"
            description="Bảng xếp hạng sẽ xuất hiện khi có hoạt động được ghi nhận trong kỳ báo cáo."
          />
        )}

        <h2>So sánh cá nhân / nhóm</h2>
        <p className="table-scroll-hint secondary-text">
          Trên màn hình nhỏ, vuốt ngang bảng để xem đủ các cột.
        </p>
        <div className="table-scroll report-comparison-scroll">
          <table aria-label="So sánh cá nhân và nhóm" className="report-comparison-table">
            <thead>
              <tr>
                <th scope="col">Nhân sự</th>
                <th scope="col">Phạm vi</th>
                <th scope="col">Khách hàng mới</th>
                <th scope="col">Hoạt động</th>
                <th scope="col">Lượt khách kết nối</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.account_id}>
                  <td>
                    {row.ho_ten} ({row.ma_dai_ly})
                  </td>
                  <td>{row.is_self ? "Cá nhân" : "Cấp dưới"}</td>
                  <td>{row.customer_count}</td>
                  <td>{row.activity_count}</td>
                  <td>{row.connected_customer_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
