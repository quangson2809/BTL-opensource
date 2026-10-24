import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

import { requireBusinessAccount } from "@/lib/business";
import { resolveReportRange } from "@/lib/reporting";
import { rankReportRows } from "@/lib/report-leaderboard.mjs";
import { buildReportComparisonMetrics, reportTotals } from "@/lib/report-metrics.mjs";
import type { ReportMetric } from "@/lib/report-metrics.mjs";

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

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function ReportComparisonCharts({ metrics, hasTeamRows }: { metrics: ReportMetric[]; hasTeamRows: boolean }) {
  const hasData = metrics.some((metric) => metric.personal > 0 || metric.team > 0);

  if (!hasData) {
    return (
      <EmptyState
        title="Chưa có dữ liệu biểu đồ"
        description="Không có khách hàng mới, hoạt động hoặc lượt khách kết nối trong khoảng thời gian đã chọn."
      />
    );
  }

  return (
    <section aria-labelledby="report-charts-title" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2 id="report-charts-title">{hasTeamRows ? "Biểu đồ so sánh cá nhân / nhóm" : "Biểu đồ số liệu cá nhân"}</h2>
        <p className="secondary-text">
          Mỗi thanh biểu thị tổng của khoảng ngày/tuần/tháng đang chọn. Biểu đồ và bảng dùng cùng kết quả RPC, không tự tạo các mốc thời gian không có trong hợp đồng dữ liệu.
        </p>
      </div>

      <div role="group" aria-label="Chú giải biểu đồ" style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <span aria-hidden="true" style={{ width: "0.8rem", height: "0.8rem", borderRadius: "0.2rem", background: "var(--color-brand)" }} />
          Cá nhân
        </span>
        {hasTeamRows ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
            <span aria-hidden="true" style={{ width: "0.8rem", height: "0.8rem", borderRadius: "0.2rem", background: "var(--color-accent)" }} />
            Nhóm cấp dưới
          </span>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "1rem" }}>
        {metrics.map((metric) => {
          const maximum = Math.max(metric.personal, metric.team, 1);
          const bars = [
            { label: "Cá nhân", value: metric.personal, color: "var(--color-brand)" },
            ...(hasTeamRows ? [{ label: "Nhóm cấp dưới", value: metric.team, color: "var(--color-accent)" }] : []),
          ];

          return (
            <article
              key={metric.key}
              style={{
                minWidth: 0,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                background: "var(--color-surface)",
              }}
            >
              <h3 style={{ marginBottom: "0.9rem" }}>{metric.label}</h3>
              <div style={{ display: "grid", gap: "0.9rem" }}>
                {bars.map((bar) => {
                  const percentage = (bar.value / maximum) * 100;
                  return (
                    <div
                      key={bar.label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "5.5rem minmax(0, 1fr) 3.5rem",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", overflowWrap: "anywhere" }}>{bar.label}</span>
                      <div
                        role="img"
                        aria-label={`${bar.label}: ${formatCount(bar.value)} ${metric.unit}`}
                        style={{
                          height: "1.1rem",
                          minWidth: 0,
                          overflow: "hidden",
                          borderRadius: "0.25rem",
                          background: "var(--color-surface-muted)",
                        }}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            width: `${percentage}%`,
                            minWidth: bar.value > 0 ? "2px" : 0,
                            height: "100%",
                            borderRadius: "inherit",
                            background: bar.color,
                          }}
                        />
                      </div>
                      <strong style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.9rem" }}>
                        {formatCount(bar.value)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
      <p className="secondary-text" style={{ fontSize: "0.85rem" }}>
        Đơn vị: số lượng {metrics.map((metric) => metric.unit).filter((unit, index, all) => all.indexOf(unit) === index).join(", ")}.
        {" "}
        {hasTeamRows
          ? "Nhóm chỉ bao gồm các tài khoản được RPC báo cáo trả về trong phạm vi quyền hiện tại."
          : "Biểu đồ chỉ hiển thị số liệu cá nhân trong phạm vi quyền hiện tại."}
      </p>
    </section>
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

  const exportQuery = new URLSearchParams({
    period: range.period,
    anchor: range.anchor,
  }).toString();

  if (error) {
    return (
      <main>
        <section className="card wide-card">
          <PageHeader
            title="Báo cáo & thống kê"
            description={teamRows.length > 0
              ? "Theo dõi kết quả cá nhân và nhóm trong phạm vi dữ liệu được cấp quyền."
              : "Theo dõi kết quả cá nhân trong phạm vi dữ liệu được cấp quyền."}
            actions={
              <>
                <Link className="button-link button-secondary" href="/dashboard">Dashboard</Link>
                <Link className="button-link" href={`/reports/export?${exportQuery}`}>Xuất Excel (.csv)</Link>
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
          <p role="alert" className="error-state">
            Không thể tải báo cáo và biểu đồ trong phạm vi dữ liệu hiện tại. Vui lòng thử lại sau.
          </p>
        </section>
      </main>
    );
  }

  const rows = (data ?? []) as ReportRow[];
  const personal = rows.find((row) => row.is_self);
  const teamRows = rows.filter((row) => !row.is_self);
  const leaderboard = rankReportRows(teamRows);
  const team = reportTotals(teamRows);
  const overview = reportTotals(rows);
  const personalTotals = reportTotals(personal ? [personal] : []);
  const chartMetrics = buildReportComparisonMetrics(rows);

  return (
    <main>
      <section className="card wide-card">
        <PageHeader
          title="Báo cáo & thống kê"
          description="Theo dõi kết quả cá nhân và nhóm trong phạm vi dữ liệu được cấp quyền."
          actions={
            <>
              <Link className="button-link button-secondary" href="/dashboard">Dashboard</Link>
              <Link className="button-link" href={`/reports/export?${exportQuery}`}>Xuất Excel (.csv)</Link>
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
            <p>Khách hàng mới: {personalTotals.customer_count}</p>
            <p>Hoạt động: {personalTotals.activity_count}</p>
            <p>Lượt khách kết nối: {personalTotals.connected_customer_count}</p>
          </article>
          {teamRows.length > 0 ? (
            <article className="card">
              <h2>Nhóm cấp dưới</h2>
              <p>Khách hàng mới: {team.customer_count}</p>
              <p>Hoạt động: {team.activity_count}</p>
              <p>Lượt khách kết nối: {team.connected_customer_count}</p>
            </article>
          ) : null}
          <article className="card">
            <h2>Tổng quan scope</h2>
            <p>Khách hàng mới: {overview.customer_count}</p>
            <p>Hoạt động: {overview.activity_count}</p>
            <p>Lượt khách kết nối: {overview.connected_customer_count}</p>
          </article>
        </div>

        <ReportComparisonCharts metrics={chartMetrics} hasTeamRows={teamRows.length > 0} />

        {teamRows.length > 0 ? (
          leaderboard.length > 0 ? (
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
          ) : null
        ) : null}

        {teamRows.length > 0 ? (
          <>
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
                  <td>{row.ho_ten} ({row.ma_dai_ly})</td>
                  <td>{row.is_self ? "Cá nhân" : "Cấp dưới"}</td>
                  <td>{row.customer_count}</td>
                  <td>{row.activity_count}</td>
                  <td>{row.connected_customer_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
