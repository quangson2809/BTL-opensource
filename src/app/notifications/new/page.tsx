import Link from "next/link";

import { ActionFeedback } from "@/components/action-feedback";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { PageHeader } from "@/components/page-header";
import { FormDraftPersistence } from "@/components/form-draft-persistence";

import { createNotification } from "@/app/notifications/actions";
import { requireDm } from "@/lib/business";

export const dynamic = "force-dynamic";

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
        <PageHeader title="Tạo thông báo" description="Soạn nội dung, chọn người nhận trong scope và tạo bản nháp trước khi gửi." actions={<Link className="button-link button-secondary" href="/notifications">Quay lại thông báo</Link>} />
        {query.error ? (
          <ActionFeedback error={query.error} />
        ) : null}
        <FormDraftPersistence persistKey="notification-draft" hasError={Boolean(query.error)} />
        <p className="form-required-note"><span aria-hidden="true">*</span> Trường bắt buộc</p>
        <form action={createNotification} className="stack notification-composer" data-persist-key="notification-draft">
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
            <label>
              Người nhận trong scope <span aria-hidden="true" className="required-indicator">*</span>
              <select multiple name="recipient_ids" required size={Math.min(Math.max((recipients ?? []).length, 4), 10)}>
                {(recipients ?? []).map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.ho_ten} — {recipient.ma_dai_ly} — {recipient.trang_thai}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-help">Giữ Ctrl/Cmd để chọn nhiều người nhận. Bản nháp chưa hiển thị cho người nhận cho đến khi DM bấm gửi.</p>
          </fieldset>
          <div className="form-actions">
            <PendingSubmitButton pendingLabel="Đang tạo bản nháp…">Tạo bản nháp</PendingSubmitButton>
            <Link className="button-link button-secondary" href="/notifications">Hủy</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
