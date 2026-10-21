import { notFound } from "next/navigation";
import { GuardedForm } from "@/components/guarded-form";

import { DraftCancelLink } from "@/components/draft-cancel-link";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { ActionFeedback } from "@/components/action-feedback";
import { SearchableCheckboxPicker } from "@/components/searchable-checkbox-picker";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import { updateNotificationDraft } from "@/app/notifications/actions";
import { requireDm } from "@/lib/business";
import { isUuid } from "@/lib/input-validation.mjs";

export const dynamic = "force-dynamic";

type EditNotificationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditNotificationPage({
  params,
  searchParams,
}: EditNotificationPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const { supabase, accountId } = await requireDm();
  const [notificationResult, recipientResult, accountsResult] = await Promise.all([
    supabase
      .from("thong_bao")
      .select("id,nguoi_tao_id,tieu_de,noi_dung,loai,trang_thai")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("thong_bao_nguoi_nhan")
      .select("tai_khoan_id")
      .eq("thong_bao_id", id),
    supabase
      .from("tai_khoan")
      .select("id,ho_ten,ma_dai_ly,trang_thai")
      .neq("id", accountId)
      .order("ho_ten"),
  ]);

  const notification = notificationResult.data;
  if (
    notificationResult.error ||
    !notification ||
    notification.nguoi_tao_id !== accountId ||
    notification.trang_thai !== "CHƯA_GỬI"
  ) {
    notFound();
  }

  if (recipientResult.error || accountsResult.error) {
    throw new Error("Không thể tải thông tin bản nháp và người nhận.");
  }

  const selectedRecipients = (recipientResult.data ?? []).map(
    (recipient) => recipient.tai_khoan_id,
  );
  const availableRecipientIds = new Set((accountsResult.data ?? []).map((recipient) => recipient.id));
  const unavailableSelectedRecipientCount = selectedRecipients.filter(
    (recipientId) => !availableRecipientIds.has(recipientId),
  ).length;
  const accountStatusLabels: Record<string, string> = {
    CHO_PHE_DUYET: "Chờ phê duyệt",
    DANG_HOAT_DONG: "Đang hoạt động",
    KHOA: "Đã khóa",
  };

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Sửa bản nháp thông báo"
          description="Chỉ bản nháp của bạn có thể được chỉnh sửa. Thông báo đã gửi được giữ nguyên."
          actions={
            <DraftCancelLink className="button-link button-secondary" href="/notifications" scopeKey={accountId} persistKeys={["notification-edit-" + notification.id]}>
              Quay lại thông báo
            </DraftCancelLink>
          }
        />
        {query.error ? <ActionFeedback error={query.error} /> : null}
        <FormDraftPersistence persistKey={"notification-edit-" + notification.id} scopeKey={accountId} hasError={Boolean(query.error)} />
        <p className="form-required-note">
          <span aria-hidden="true">*</span> Trường bắt buộc
        </p>
        <GuardedForm action={updateNotificationDraft} className="stack notification-composer" data-persist-key={"notification-edit-" + notification.id}>
          <input name="notification_id" type="hidden" value={notification.id} />
          <fieldset className="form-section">
            <legend>Nội dung thông báo</legend>
            <div className="form-grid">
              <label>
                Tiêu đề <span aria-hidden="true" className="required-indicator">*</span>
                <input
                  autoComplete="off"
                  defaultValue={notification.tieu_de}
                  name="tieu_de"
                  required
                />
              </label>
              <label>
                Loại thông báo <span aria-hidden="true" className="required-indicator">*</span>
                <select defaultValue={notification.loai} name="loai" required>
                  <option value="TIN_TỨC">Tin tức</option>
                  <option value="TỰ_ĐỘNG_HỆ_THỐNG">Tự động hệ thống</option>
                </select>
              </label>
              <label className="field-full">
                Nội dung <span aria-hidden="true" className="required-indicator">*</span>
                <textarea
                  defaultValue={notification.noi_dung}
                  name="noi_dung"
                  required
                />
              </label>
            </div>
          </fieldset>
          <fieldset className="form-section">
            <legend>Phạm vi nhận</legend>
            {unavailableSelectedRecipientCount > 0 ? (
              <p className="message error" role="alert">
                Có {unavailableSelectedRecipientCount} người nhận trong bản nháp hiện không nằm trong danh sách mà bạn được phép quản lý.
                Để tránh vô tình thay đổi phạm vi nhận, hãy yêu cầu quản trị viên kiểm tra quyền truy cập trước khi lưu.
              </p>
            ) : null}
            <SearchableCheckboxPicker
              name="recipient_ids"
              selectedIds={selectedRecipients}
              options={(accountsResult.data ?? []).map((recipient) => ({
                id: recipient.id,
                label: recipient.ho_ten,
                detail: recipient.ma_dai_ly + " · " + (accountStatusLabels[recipient.trang_thai] ?? "Chưa xác định trạng thái"),
                searchText: recipient.ho_ten + " " + recipient.ma_dai_ly + " " + recipient.trang_thai,
                group: "Người nhận trong phạm vi",
              }))}
              searchLabel="Tìm người nhận"
              searchPlaceholder="Tên hoặc mã đại lý"
              selectedCountLabel="người nhận"
              emptyMessage="Không có tài khoản nào khác trong phạm vi có thể chọn làm người nhận."
              noResultsMessage="Không tìm thấy người nhận phù hợp. Thử tên hoặc mã đại lý khác."
              required
              requiredMessage="Chọn ít nhất một người nhận trước khi lưu bản nháp."
            />
            <p className="field-help">
              Danh sách lựa chọn chịu giới hạn bởi quyền truy cập hiện hành của DM.
              Người nhận mới chỉ thấy nội dung sau khi thông báo được gửi.
            </p>
          </fieldset>
          <div className="form-actions">
            <PendingSubmitButton disabled={unavailableSelectedRecipientCount > 0} pendingLabel="Đang lưu bản nháp…">
              Lưu thay đổi
            </PendingSubmitButton>
            <DraftCancelLink className="button-link button-secondary" href="/notifications" scopeKey={accountId} persistKeys={["notification-edit-" + notification.id]}>
              Hủy
            </DraftCancelLink>
          </div>
        </GuardedForm>
      </section>
    </main>
  );
}
