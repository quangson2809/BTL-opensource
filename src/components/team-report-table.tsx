import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import type { TeamReportRow } from "@/lib/team-report.mjs";

export function TeamReportTable({ rows, exportQuery }: { rows: TeamReportRow[]; exportQuery: string }) {
  return <section aria-labelledby="team-comparison-title" className="detail-section">
    <h2 id="team-comparison-title">So sánh nhóm UM</h2>
    <p className="secondary-text">Mỗi nhóm gồm UM và cây nhân sự bên dưới theo cơ cấu hiện tại, tính cả UM. Nhóm UM lồng nhau chỉ được tính trong nhóm ngoài cùng. Nhân sự chưa thuộc nhóm UM vẫn có trong báo cáo tổng quan.</p>
    <Link className="button-link" href={`/reports/export?dataset=teams&format=xlsx&${exportQuery}`}>Xuất so sánh nhóm (.xlsx)</Link>
    {rows.length === 0 ? <EmptyState title="Chưa có nhóm UM trong phạm vi" description="Nhóm xuất hiện khi có UM trong cây nhân sự được phép xem." /> : <>
      <p className="table-scroll-hint secondary-text">Trên màn hình nhỏ, vuốt ngang để xem đủ cột.</p>
      <div className="table-scroll"><table aria-label="So sánh nhóm UM"><thead><tr><th scope="col">Nhóm UM</th><th scope="col">Mã đại lý UM</th><th scope="col">Nhân sự</th><th scope="col">Khách hàng mới</th><th scope="col">Hoạt động</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.team_id}><td>{row.team_name}</td><td>{row.team_code}</td><td>{row.member_count.toLocaleString("vi-VN")}</td><td>{row.customer_count.toLocaleString("vi-VN")}</td><td>{row.activity_count.toLocaleString("vi-VN")}</td></tr>)}
      </tbody></table></div>
    </>}
  </section>;
}
