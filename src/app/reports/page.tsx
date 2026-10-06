import Link from "next/link";

import { requireBusinessAccount } from "@/lib/business";
import { resolveReportRange } from "@/lib/reporting";

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
  const team = totals(teamRows);
  const overview = totals(rows);
  const exportQuery = new URLSearchParams({
    period: range.period,
    anchor: range.anchor,
  }).toString();

  return (
    <main>
      <section className="card wide-card">
        <h1>Báo cáo & thống kê</h1>
        <div className="actions">
          <Link href="/dashboard">Dashboard</Link>
          <Link
            className="button-link"
            href={`/reports/export?${exportQuery}`}
          >
            Xuất Excel (.csv)
          </Link>
        </div>

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

        <h2>So sánh cá nhân / nhóm</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nhân sự</th>
                <th>Phạm vi</th>
                <th>Khách hàng mới</th>
                <th>Hoạt động</th>
                <th>Lượt khách kết nối</th>
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
