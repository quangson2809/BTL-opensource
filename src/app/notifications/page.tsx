import Link from "next/link";

import { ActionFeedback } from "@/components/action-feedback";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ListPagination, ResultSummary } from "@/components/list-controls";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import {
  markNotificationRead,
  sendNotification,
} from "@/app/notifications/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type NotificationsPageProps = {
  searchParams: Promise<{ status?: string; error?: string; q?: string; loai?: string; trang_thai?: string; page?: string }>;
};

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const query = await searchParams;
  const { supabase, accountId } = await requireBusinessAccount();
  const [dmResult, notificationResult, recipientResult] = await Promise.all([
    supabase.rpc("has_role", { role_code: "DM" }),
    supabase
      .from("thong_bao")
      .select(
        "id,nguoi_tao_id,tieu_de,noi_dung,loai,trang_thai,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("thong_bao_nguoi_nhan")
      .select("id,thong_bao_id,tai_khoan_id,da_doc"),
  ]);

  if (dmResult.error || notificationResult.error || recipientResult.error) {
    throw new Error("Không thể tải thông báo.");
  }

  const isDm = dmResult.data === true;
  const allNotifications = notificationResult.data ?? [];
  const search = (query.q ?? "").trim().toLocaleLowerCase("vi");
  const notifications = allNotifications.filter((notification) => {
    const matchesSearch = !search ||
      notification.tieu_de.toLocaleLowerCase("vi").includes(search) ||
      notification.noi_dung.toLocaleLowerCase("vi").includes(search);
    const matchesType = !query.loai || notification.loai === query.loai;
    const matchesStatus = !query.trang_thai || notification.trang_thai === query.trang_thai;
    return matchesSearch && matchesType && matchesStatus;
  });
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(notifications.length / pageSize));
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount);
  const visibleNotifications = notifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filterParams = { q: query.q, loai: query.loai, trang_thai: query.trang_thai };
  const hasFilters = Object.values(filterParams).some((value) => Boolean(value?.trim()));
  const notificationTypes = Array.from(new Set(allNotifications.map((item) => item.loai)));
  const notificationStatuses = Array.from(new Set(allNotifications.map((item) => item.trang_thai)));
  const recipientRows = recipientResult.data ?? [];
  const rowsByNotification = new Map<string, typeof recipientRows>();
  for (const row of recipientRows) {
    rowsByNotification.set(row.thong_bao_id, [
      ...(rowsByNotification.get(row.thong_bao_id) ?? []),
      row,
    ]);
  }

  return (
    <main>
      <section className="card wide-card">
        <PageHeader
          actions={
            isDm ? (
              <Link className="button-link" href="/notifications/new">
                Tạo thông báo
              </Link>
            ) : undefined
          }
          description="Xem thông báo được gửi đến bạn và trạng thái gửi/đọc trong phạm vi của mình."
          title="Thông báo"
        />

        {query.status ? <ActionFeedback status={query.status} /> : null}
        {query.error ? <ActionFeedback error={query.error} /> : null}

        <form className="filter-grid" method="get">
          <label>
            Tìm kiếm
            <input defaultValue={query.q ?? ""} name="q" placeholder="Tiêu đề hoặc nội dung" />
          </label>
          <label>
            Loại thông báo
            <select defaultValue={query.loai ?? ""} name="loai">
              <option value="">Tất cả loại</option>
              {notificationTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label>
            Trạng thái
            <select defaultValue={query.trang_thai ?? ""} name="trang_thai">
              <option value="">Tất cả trạng thái</option>
              {notificationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>

        <ResultSummary label="thông báo" total={notifications.length} currentPage={currentPage} pageSize={pageSize} hasFilters={hasFilters} clearHref="/notifications" />

        <div className="stack">
          {notifications.length === 0 ? (
            <EmptyState
              actionHref={isDm ? "/notifications/new" : undefined}
              actionLabel={isDm ? "Tạo thông báo đầu tiên" : undefined}
              description={
                isDm
                  ? "Tạo bản nháp rồi kiểm tra người nhận trước khi gửi."
                  : "Thông báo sẽ xuất hiện tại đây khi có thông báo trong phạm vi của bạn."
              }
              title="Chưa có thông báo"
            />
          ) : null}
          {visibleNotifications.map((notification) => {
            const recipientRowsForNotification =
              rowsByNotification.get(notification.id) ?? [];
            const ownRecipientRow = recipientRowsForNotification.find(
              (row) => row.tai_khoan_id === accountId,
            );
            const owned = notification.nguoi_tao_id === accountId;

            return (
              <article className="record-row" key={notification.id}>
                <p>
                  <strong>{notification.tieu_de}</strong>
                </p>
                <p>{notification.noi_dung}</p>
                <p className="secondary-text">
                  {notification.loai} · <StatusBadge value={notification.trang_thai} /> ·{" "}
                  {new Date(notification.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                </p>
                {owned ? (
                  <p className="secondary-text">
                    Người nhận: {recipientRowsForNotification.length}
                  </p>
                ) : null}
                {owned && notification.trang_thai === "CHƯA_GỬI" ? (
                  <form action={sendNotification}>
                    <input
                      name="notification_id"
                      type="hidden"
                      value={notification.id}
                    />
                    <PendingSubmitButton
                      confirmMessage="Gửi thông báo này đến toàn bộ người nhận đã chọn?"
                      pendingLabel="Đang gửi…"
                    >
                      Gửi thông báo
                    </PendingSubmitButton>
                  </form>
                ) : null}
                {ownRecipientRow && !ownRecipientRow.da_doc ? (
                  <form action={markNotificationRead}>
                    <input
                      name="recipient_row_id"
                      type="hidden"
                      value={ownRecipientRow.id}
                    />
                    <PendingSubmitButton pendingLabel="Đang cập nhật…">
                      Đánh dấu đã đọc
                    </PendingSubmitButton>
                  </form>
                ) : null}
                {ownRecipientRow?.da_doc ? (
                  <p className="secondary-text">Đã đọc</p>
                ) : null}
              </article>
            );
          })}
        </div>
        <ListPagination basePath="/notifications" currentPage={currentPage} pageCount={pageCount} params={filterParams} />
      </section>
    </main>
  );
}
