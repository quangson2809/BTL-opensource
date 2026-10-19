import Link from "next/link";
import { notFound } from "next/navigation";
import { GuardedForm } from "@/components/guarded-form";

import { ActionFeedback } from "@/components/action-feedback";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { updateActivity } from "@/app/activities/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type EditActivityPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

function localDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day + "T" + values.hour + ":" + values.minute;
}

export default async function EditActivityPage({ params, searchParams }: EditActivityPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, accountId } = await requireBusinessAccount();
  const { data: activity, error } = await supabase
    .from("hoat_dong")
    .select("id,tai_khoan_id,loai_hoat_dong,dia_diem,thoi_gian,so_khach_hang_ket_noi")
    .eq("id", id)
    .eq("tai_khoan_id", accountId)
    .maybeSingle();

  if (error) throw new Error("Không thể tải hoạt động.");
  if (!activity) notFound();

  const persistKey = "activity-edit-" + activity.id;

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Chỉnh sửa hoạt động"
          description="Cập nhật thông tin bản ghi đã chọn."
          actions={<Link className="button-link button-secondary" href="/activities">Quay lại lịch sử</Link>}
        />
        {query.error ? <ActionFeedback error={query.error} /> : null}
        <FormDraftPersistence persistKey={persistKey} hasError={Boolean(query.error)} />
        <p className="form-required-note"><span aria-hidden="true">*</span> Các trường trong biểu mẫu đều bắt buộc.</p>
        <GuardedForm action={updateActivity} className="stack form-layout" data-persist-key={persistKey}>
          <input name="activity_id" type="hidden" value={activity.id} />
          <fieldset className="form-section">
            <legend>Chi tiết hoạt động</legend>
            <div className="form-grid">
              <label><span className="field-label">Loại hoạt động <span aria-hidden="true" className="required-indicator">*</span></span>
                <select defaultValue={activity.loai_hoat_dong} name="loai_hoat_dong" required>
                  <option value="KHẢO_SÁT">Khảo sát</option><option value="GẶP_GỠ">Gặp gỡ</option><option value="TƯ_VẤN">Tư vấn</option>
                </select>
              </label>
              <label><span className="field-label">Địa điểm <span aria-hidden="true" className="required-indicator">*</span></span><input defaultValue={activity.dia_diem} name="dia_diem" required /></label>
              <label><span className="field-label">Thời gian <span aria-hidden="true" className="required-indicator">*</span></span><input defaultValue={localDateTime(activity.thoi_gian)} name="thoi_gian" required type="datetime-local" /></label>
              <label><span className="field-label">Số khách hàng kết nối <span aria-hidden="true" className="required-indicator">*</span></span><input defaultValue={activity.so_khach_hang_ket_noi} min="0" name="so_khach_hang_ket_noi" required type="number" /></label>
            </div>
          </fieldset>
          <div className="form-actions"><PendingSubmitButton pendingLabel="Đang lưu thay đổi…">Lưu thay đổi</PendingSubmitButton></div>
        </GuardedForm>
      </section>
    </main>
  );
}
