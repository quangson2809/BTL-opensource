import Link from "next/link";

import { GuardedForm } from "@/components/guarded-form";
import { FormDraftClear } from "@/components/form-draft-clear";
import { ActionFeedback } from "@/components/action-feedback";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ListPagination, ResultSummary } from "@/components/list-controls";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import {
  deleteNotificationDraft,
  markNotificationRead,
  sendNotification,
} from "@/app/notifications/actions";
import { requireBusinessAccount } from "@/lib/business";
import { parsePositivePage, sanitizePostgrestOrSearch } from "@/lib/list-query.mjs";

export const dynamic = "force-dynamic";

type NotificationsPageProps = {
  searchParams: Promise<{
    status?: string;
    error?: string;
    q?: string;
    loai?: string;
    trang_thai?: string;
    page?: string;
    id?: string;
  }>;
};

const notificationTypes = new Set(["TIN_TỨC", "TỰ_ĐỘNG_HỆ_THỐNG"]);
const notificationStatuses = new Set(["CHƯA_GỬI", "ĐÃ_GỬI"]);

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const query = await searchParams;
  const { supabase, accountId } = await requireBusinessAccount();

  const search = sanitizePostgrestOrSearch(query.q);
  const type = query.loai && notificationTypes.has(query.loai) ? query.loai : "";
  const status = query.trang_thai && notificationStatuses.has(query.trang_thai) ? query.trang_thai : "";
  const [dmResult, countResult] = await Promise.all([
    supabase.rpc("has_role", { role_code: "DM" }),
    (async () => {
      let countQuery = supabase
        .from("thong_bao")
        .select("id", { count: "exact", head: true });
      if (search) {
        countQuery = countQuery.or(`tieu_de.ilike.%${search}%,noi_dung.ilike.%${search}%`);
      }
      if (type) countQuery = countQuery.eq("loai", type);
      if (status) countQuery = countQuery.eq("trang_thai", status);
      return countQuery;
    })(),
  ]);

  if (dmResult.error || countResult.error) {
    throw new Error("Không thể tải thông báo trong phạm vi được cấp quyền.");
  }

  const total = countResult.count ?? 0;
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(parsePositivePage(query.page), pageCount);
  const firstRow = (currentPage - 1) * pageSize;

  let notificationQuery = supabase
    .from("thong_bao")
    .select("id,nguoi_tao_id,tieu_de,noi_dung,loai,trang_thai,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(firstRow, firstRow + pageSize - 1);
  if (search) {
    notificationQuery = notificationQuery.or(
      `tieu_de.ilike.%${search}%,noi_dung.ilike.%${search}%`,
    );
  }
  if (type) notificationQuery = notificationQuery.eq("loai", type);
  if (status) notificationQuery = notificationQuery.eq("trang_thai", status);

  const { data, error } = await notificationQuery;
  if (error) {
    throw new Error("Không thể tải thông báo trong phạm vi được cấp quyền.");
  }

  const visibleNotifications = data ?? [];
  const notificationIds = visibleNotifications.map((notification) => notification.id);
  const recipientResult = notificationIds.length > 0
    ? await supabase
        .from("thong_bao_nguoi_nhan")
        .select("id,thong_bao_id,tai_khoan_id,da_doc")
        .in("thong_bao_id", notificationIds)
    : { data: [], error: null };

  if (recipientResult.error) {
    throw new Error("Không thể tải trạng thái người nhận.");
  }

  const isDm = dmResult.data === true;
  const recipientRows = recipientResult.data ?? [];
  const rowsByNotification = new Map<string, typeof recipientRows>();
  for (const row of recipientRows) {
    rowsByNotification.set(row.thong_bao_id, [
      ...(rowsByNotification.get(row.thong_bao_id) ?? []),
      row,
    ]);
  }

  const filterParams = { q: query.q, loai: type, trang_thai: status };
  const hasFilters = Boolean(search || type || status);

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

        <FormDraftClear scopeKey={accountId} persistKeys={["notification-draft", ...(query.id ? ["notification-edit-" + query.id] : [])]} clearOn={query.status === "created" || query.status === "updated"} />
        {query.status ? <ActionFeedback status={query.status} /> : null}
        {query.error ? <ActionFeedback error={query.error} /> : null}

        <form className="filter-grid" method="get">
          <label>
            Tìm kiếm
            <input defaultValue={query.q ?? ""} name="q" placeholder="Tiêu đề hoặc nội dung" />
          </label>
          <label>
            Loại thông báo
            <select defaultValue={type} name="loai">
              <option value="">Tất cả loại</option>
              <option value="TIN_TỨC">Tin tức</option>
              <option value="TỰ_ĐỘNG_HỆ_THỐNG">Tự động hệ thống</option>
            </select>
          </label>
          <label>
            Trạng thái
            <select defaultValue={status} name="trang_thai">
              <option value="">Tất cả trạng thái</option>
              <option value="CHƯA_GỬI">Chưa gửi</option>
              <option value="ĐÃ_GỬI">Đã gửi</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>

        <ResultSummary label="thông báo" total={total} currentPage={currentPage} pageSize={pageSize} hasFilters={hasFilters} clearHref="/notifications" />

        <div className="stack">
          {total === 0 ? (
            <EmptyState
              actionHref={isDm && !hasFilters ? "/notifications/new" : undefined}
              actionLabel={isDm && !hasFilters ? "Tạo thông báo đầu tiên" : undefined}
              description={
                isDm && !hasFilters
                  ? "Tạo bản nháp rồi kiểm tra người nhận trước khi gửi."
                  : "Thông báo sẽ xuất hiện tại đây khi có thông báo trong phạm vi của bạn. Thử thay đổi bộ lọc nếu đang tìm kiếm."
              }
              title={hasFilters ? "Không tìm thấy kết quả" : "Chưa có thông báo"}
            />
          ) : null}
          {visibleNotifications.map((notification) => {
            const recipientRowsForNotification =
              rowsByNotification.get(notification.id) ?? [];
            const ownRecipientRow = recipientRowsForNotification.find(
              (row) => row.tai_khoan_id === accountId,
            );
            const owned = notification.nguoi_tao_id === accountId;
            const isDraft = notification.trang_thai === "CHƯA_GỬI";

            return (
              <article className="record-row" key={notification.id}>
                <p><strong>{notification.tieu_de}</strong></p>
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
                {owned && isDraft ? (
                  <div className="actions">
                    <Link href={"/notifications/" + notification.id + "/edit"}>
                      Sửa bản nháp
                    </Link>
                    <GuardedForm action={deleteNotificationDraft}>
                      <input name="notification_id" type="hidden" value={notification.id} />
                      <PendingSubmitButton
                        confirmMessage="Xóa bản nháp này? Người nhận chưa thể xem thông báo."
                        pendingLabel="Đang xóa…"
                      >
                        Xóa bản nháp
                      </PendingSubmitButton>
                    </form>
                    <GuardedForm action={sendNotification}>
                      <input name="notification_id" type="hidden" value={notification.id} />
                      <PendingSubmitButton
                        confirmMessage="Gửi thông báo này đến toàn bộ người nhận đã chọn?"
                        pendingLabel="Đang gửi…"
                      >
                        Gửi thông báo
                      </PendingSubmitButton>
                    </form>
                  </div>
                ) : null}
                {ownRecipientRow && !ownRecipientRow.da_doc ? (
                  <GuardedForm action={markNotificationRead}>
                    <input name="recipient_row_id" type="hidden" value={ownRecipientRow.id} />
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
