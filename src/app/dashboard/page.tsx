import Link from "next/link";

import { logout } from "@/app/auth/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, account } = await requireBusinessAccount();
  const [
    adminResult, dmResult, umResult, customerCountResult, activityCountResult,
    recentActivityResult, unreadCountResult,
  ] = await Promise.all([
    supabase.rpc("has_role", { role_code: "ADMIN" }),
    supabase.rpc("has_role", { role_code: "DM" }),
    supabase.rpc("has_role", { role_code: "UM" }),
    supabase.from("khach_hang").select("id", { count: "exact", head: true }),
    supabase.from("hoat_dong").select("id", { count: "exact", head: true }),
    supabase.from("hoat_dong").select("id,loai_hoat_dong,dia_diem,thoi_gian").order("thoi_gian", { ascending: false }).limit(5),
    supabase.from("thong_bao_nguoi_nhan").select("id", { count: "exact", head: true }).eq("tai_khoan_id", account.id).eq("da_doc", false),
  ]);

  if (adminResult.error || dmResult.error || umResult.error || customerCountResult.error ||
      activityCountResult.error || recentActivityResult.error || unreadCountResult.error) {
    throw new Error("Không thể tải tổng quan theo quyền tài khoản.");
  }

  const isAdmin = adminResult.data === true;
  const isManager = dmResult.data === true || umResult.data === true;
  const [accountCountResult, pendingAccountCountResult] = isAdmin
    ? await Promise.all([
        supabase.from("tai_khoan").select("id", { count: "exact", head: true }),
        supabase.from("tai_khoan").select("id", { count: "exact", head: true }).eq("trang_thai", "CHO_PHE_DUYET"),
      ])
    : [null, null];

  if (accountCountResult?.error || pendingAccountCountResult?.error) {
    throw new Error("Không thể tải số liệu quản trị tài khoản.");
  }

  const recentActivities = recentActivityResult.data ?? [];
  const unreadCount = unreadCountResult.count ?? 0;

  return (
    <main className="workspace-page">
      <section className="page-content dashboard-content">
        <PageHeader
          title={"Xin chào, " + account.ho_ten}
          description="Tổng quan công việc và dữ liệu trong phạm vi quyền truy cập của bạn."
          actions={<form action={logout}><button className="button-secondary" type="submit">Đăng xuất</button></form>}
        />
        <div className="dashboard-profile">
          <div>
            <p className="dashboard-profile-label">TÀI KHOẢN ĐANG SỬ DỤNG</p>
            <p className="dashboard-profile-email">{account.email}</p>
          </div>
          <StatusBadge value={account.trang_thai} />
        </div>

        <div aria-label="Số liệu tổng hợp" className="metric-grid">
          <Link className="metric-card" href="/customers">
            <span className="metric-label">Khách hàng trong phạm vi</span>
            <strong className="metric-value">{customerCountResult.count ?? 0}</strong>
            <span className="metric-link">Mở danh sách →</span>
          </Link>
          <Link className="metric-card" href="/activities">
            <span className="metric-label">Hoạt động ghi nhận</span>
            <strong className="metric-value">{activityCountResult.count ?? 0}</strong>
            <span className="metric-link">Xem lịch sử →</span>
          </Link>
          <Link className="metric-card" href="/notifications">
            <span className="metric-label">Thông báo chưa đọc</span>
            <strong className="metric-value">{unreadCount}</strong>
            <span className="metric-link">Kiểm tra thông báo →</span>
          </Link>
          {isAdmin ? (
            <Link className="metric-card" href="/admin/accounts">
              <span className="metric-label">Tài khoản toàn hệ thống</span>
              <strong className="metric-value">{accountCountResult?.count ?? 0}</strong>
              <span className="metric-link">Chờ duyệt: {pendingAccountCountResult?.count ?? 0} · Quản trị →</span>
            </Link>
          ) : null}
        </div>

        <section aria-labelledby="dashboard-actions-title" className="dashboard-section">
          <div className="section-heading dashboard-section-heading">
            <h2 id="dashboard-actions-title">Cần xử lý</h2>
            <p>Các việc cần chú ý được tính từ trạng thái dữ liệu thực tế.</p>
          </div>
          <div className="action-needed-list">
            <div className="action-needed-row">
              <div>
                <strong>Thông báo chưa đọc</strong>
                <p>{unreadCount > 0 ? "Có thông báo cần xem lại." : "Bạn đã đọc hết thông báo trong phạm vi hiện có."}</p>
              </div>
              <Link href="/notifications">Mở thông báo</Link>
            </div>
            {isAdmin ? (
              <div className="action-needed-row">
                <div>
                  <strong>Tài khoản chờ phê duyệt</strong>
                  <p>{(pendingAccountCountResult?.count ?? 0) > 0 ? "Có yêu cầu đang chờ xử lý." : "Không có tài khoản chờ duyệt."}</p>
                </div>
                <Link href="/admin/accounts">Quản trị tài khoản</Link>
              </div>
            ) : null}
            {isManager ? (
              <div className="action-needed-row">
                <div>
                  <strong>Thông báo nội bộ</strong>
                  <p>Rà soát thông báo hiện có trong phạm vi được phép.</p>
                </div>
                <Link href="/notifications">Mở thông báo</Link>
              </div>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="dashboard-recent-title" className="dashboard-section">
          <div className="section-heading dashboard-section-heading">
            <h2 id="dashboard-recent-title">Hoạt động gần đây</h2>
            <p>5 hoạt động mới nhất mà tài khoản này được phép xem.</p>
          </div>
          {recentActivities.length === 0 ? (
            <EmptyState title="Chưa có hoạt động" description="Các hoạt động mới sẽ xuất hiện tại đây sau khi được ghi nhận." />
          ) : (
            <div className="recent-activity-list">
              {recentActivities.map((activity) => (
                <article className="record-row" key={activity.id}>
                  <div className="record-row-main">
                    <strong>{activity.dia_diem}</strong>
                    <p className="secondary-text">{new Date(activity.thoi_gian).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
                  </div>
                  <StatusBadge value={activity.loai_hoat_dong} />
                </article>
              ))}
            </div>
          )}
          <p className="dashboard-more-link"><Link href="/activities">Xem tất cả hoạt động</Link></p>
        </section>
      </section>
    </main>
  );
}
