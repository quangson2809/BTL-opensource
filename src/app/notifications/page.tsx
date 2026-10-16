import Link from "next/link";

import { ActionFeedback } from "@/components/action-feedback";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import {
  markNotificationRead,
  sendNotification,
} from "@/app/notifications/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type NotificationsPageProps = {
  searchParams: Promise<{ status?: string; error?: string }>;
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
  const notifications = notificationResult.data ?? [];
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
          {notifications.map((notification) => {
            const recipientRowsForNotification =
              rowsByNotification.get(notification.id) ?? [];
            const ownRecipientRow = recipientRowsForNotification.find(
              (row) => row.tai_khoan_id === accountId,
            );
            const owned = notification.nguoi_tao_id === accountId;

            return (
              <article className="card" key={notification.id}>
                <p>
                  <strong>{notification.tieu_de}</strong>
                </p>
                <p>{notification.noi_dung}</p>
                <p className="secondary-text">
                  {notification.loai} · {notification.trang_thai} ·{" "}
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
      </section>
    </main>
  );
}
