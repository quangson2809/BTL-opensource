import Link from "next/link";
import { GuardedForm } from "@/components/guarded-form";

import { ActionFeedback } from "@/components/action-feedback";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createActivity } from "@/app/activities/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type NewActivityPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewActivityPage({ searchParams }: NewActivityPageProps) {
  const query = await searchParams;
  await requireBusinessAccount();

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Tạo hoạt động"
          description="Ghi nhận hoạt động kinh doanh và số khách hàng kết nối."
          actions={<Link className="button-link button-secondary" href="/activities">Quay lại lịch sử</Link>}
        />
        {query.error ? <ActionFeedback error={query.error} /> : null}
        <FormDraftPersistence persistKey="activity-create" hasError={Boolean(query.error)} />
        <p className="form-required-note"><span aria-hidden="true">*</span> Các trường trong biểu mẫu đều bắt buộc.</p>
        <GuardedForm action={createActivity} className="stack form-layout" data-persist-key="activity-create">
          <fieldset className="form-section">
            <legend>Chi tiết hoạt động</legend>
            <div className="form-grid">
              <label><span className="field-label">Loại hoạt động <span aria-hidden="true" className="required-indicator">*</span></span>
                <select defaultValue="KHẢO_SÁT" name="loai_hoat_dong" required>
                  <option value="KHẢO_SÁT">Khảo sát</option><option value="GẶP_GỠ">Gặp gỡ</option><option value="TƯ_VẤN">Tư vấn</option>
                </select>
              </label>
              <label><span className="field-label">Địa điểm <span aria-hidden="true" className="required-indicator">*</span></span><input name="dia_diem" required /></label>
              <label><span className="field-label">Thời gian <span aria-hidden="true" className="required-indicator">*</span></span><input name="thoi_gian" required type="datetime-local" /></label>
              <label><span className="field-label">Số khách hàng kết nối <span aria-hidden="true" className="required-indicator">*</span></span><input min="0" name="so_khach_hang_ket_noi" required type="number" /></label>
            </div>
          </fieldset>
          <div className="form-actions"><PendingSubmitButton pendingLabel="Đang lưu hoạt động…">Lưu hoạt động</PendingSubmitButton></div>
        </GuardedForm>
      </section>
    </main>
  );
}
