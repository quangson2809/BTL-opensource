import { DraftCancelLink } from "@/components/draft-cancel-link";
import { GuardedForm } from "@/components/guarded-form";

import { ActionFeedback } from "@/components/action-feedback";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { PageHeader } from "@/components/page-header";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { SearchableCheckboxPicker } from "@/components/searchable-checkbox-picker";

import { createNotification } from "@/app/notifications/actions";
import { requireDm } from "@/lib/business";

export const dynamic = "force-dynamic";

const accountStatusLabels: Record<string, string> = {
  CHO_PHE_DUYET: "Chờ phê duyệt",
  DANG_HOAT_DONG: "Đang hoạt động",
  KHOA: "Đã khóa",
};

type NewNotificationPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewNotificationPage({
  searchParams,
}: NewNotificationPageProps) {
  const query = await searchParams;
  const { supabase, accountId } = await requireDm();
  const { data: recipients, error } = await supabase
    .from("tai_khoan")
    .select("id,ho_ten,ma_dai_ly,trang_thai")
    .neq("id", accountId)
    .order("ho_ten");

  if (error) {
    throw new Error("Không thể tải người nhận trong scope.");
  }

  return (
    <main>
      <section className="page-content">
        <PageHeader title="Tạo thông báo" description="Soạn nội dung, chọn người nhận trong scope và tạo bản nháp trước khi gửi." actions={<DraftCancelLink className="button-link button-secondary" href="/notifications" scopeKey={accountId} persistKeys={["notification-draft"]}>Quay lại thông báo</DraftCancelLink>} />
        {query.error ? (
          <ActionFeedback error={query.error} />
        ) : null}
        <FormDraftPersistence scopeKey={accountId} persistKey="notification-draft" hasError={Boolean(query.error)} />
        <p className="form-required-note"><span aria-hidden="true">*</span> Trường bắt buộc</p>
        <GuardedForm action={createNotification} className="stack notification-composer" data-persist-key="notification-draft">
          <fieldset className="form-section">
            <legend>Nội dung thông báo</legend>
            <div className="form-grid">
              <label>
                Tiêu đề <span aria-hidden="true" className="required-indicator">*</span>
                <input autoComplete="off" name="tieu_de" required />
              </label>
              <label>
                Loại thông báo <span aria-hidden="true" className="required-indicator">*</span>
                <select defaultValue="TIN_TỨC" name="loai" required>
                  <option value="TIN_TỨC">Tin tức</option>
                  <option value="TỰ_ĐỘNG_HỆ_THỐNG">Tự động hệ thống</option>
                </select>
              </label>
              <label className="field-full">
                Nội dung <span aria-hidden="true" className="required-indicator">*</span>
                <textarea name="noi_dung" required />
              </label>
            </div>
          </fieldset>
          <fieldset className="form-section">
            <legend>Phạm vi nhận</legend>
            <SearchableCheckboxPicker
              name="recipient_ids"
              options={(recipients ?? []).map((recipient) => ({
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
              requiredMessage="Chọn ít nhất một người nhận trước khi tạo bản nháp."
            />
            <p className="field-help">Bản nháp chưa hiển thị cho người nhận cho đến khi DM bấm gửi.</p>
          </fieldset>
          <div className="form-actions">
            <PendingSubmitButton pendingLabel="Đang tạo bản nháp…">Tạo bản nháp</PendingSubmitButton>
            <DraftCancelLink className="button-link button-secondary" href="/notifications" scopeKey={accountId} persistKeys={["notification-draft"]}>Hủy</DraftCancelLink>
          </div>
        </GuardedForm>
      </section>
    </main>
  );
}
