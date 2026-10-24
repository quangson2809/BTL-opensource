import { DraftCancelLink } from "@/components/draft-cancel-link";
import { GuardedForm } from "@/components/guarded-form";

import { ActionFeedback } from "@/components/action-feedback";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createCustomer } from "@/app/customers/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type NewCustomerPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewCustomerPage({ searchParams }: NewCustomerPageProps) {
  const query = await searchParams;
  const { accountId } = await requireBusinessAccount();

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Thêm khách hàng"
          description="Tạo hồ sơ khách hàng trong phạm vi được cấp quyền; mã khách hàng được sinh tự động."
          actions={<DraftCancelLink className="button-link button-secondary" href="/customers" scopeKey={accountId} persistKeys={["customer-create"]}>Quay lại danh sách</DraftCancelLink>}
        />
        {query.error ? <ActionFeedback error={query.error} /> : null}
        <FormDraftPersistence scopeKey={accountId} persistKey="customer-create" hasError={Boolean(query.error)} />
        <p className="form-required-note"><span aria-hidden="true">*</span> Các trường trong biểu mẫu đều bắt buộc.</p>
        <GuardedForm action={createCustomer} className="stack form-layout" data-persist-key="customer-create">
          <fieldset className="form-section">
            <legend>Thông tin cơ bản</legend>
            <div className="form-grid">
              <label><span className="field-label">Họ tên <span aria-hidden="true" className="required-indicator">*</span></span><input autoComplete="name" name="ho_ten" required /></label>
              <label><span className="field-label">Số điện thoại <span aria-hidden="true" className="required-indicator">*</span></span><input autoComplete="tel" name="so_dien_thoai" required /></label>
              <label><span className="field-label">Giới tính <span aria-hidden="true" className="required-indicator">*</span></span><input name="gioi_tinh" required /></label>
              <label><span className="field-label">Ngày sinh <span aria-hidden="true" className="required-indicator">*</span></span><input name="ngay_sinh" required type="date" /></label>
              <label><span className="field-label">Địa chỉ <span aria-hidden="true" className="required-indicator">*</span></span><input autoComplete="street-address" name="dia_chi" required /></label>
            </div>
          </fieldset>
          <fieldset className="form-section">
            <legend>Thông tin hồ sơ</legend>
            <div className="form-grid">
              <label><span className="field-label">Sở thích <span aria-hidden="true" className="required-indicator">*</span></span><textarea name="so_thich" required /></label>
              <label><span className="field-label">Ghi chú <span aria-hidden="true" className="required-indicator">*</span></span><textarea name="ghi_chu" required /></label>
              <label><span className="field-label">Loại khách hàng <span aria-hidden="true" className="required-indicator">*</span></span>
                <select defaultValue="MUC_TIEU" name="loai_khach_hang" required>
                  <option value="MUC_TIEU">Mục tiêu</option><option value="NUOI_DUONG">Nuôi dưỡng</option><option value="DOI_TAC">Đối tác</option>
                </select>
              </label>
              <label><span className="field-label">Tình trạng <span aria-hidden="true" className="required-indicator">*</span></span>
                <select defaultValue="BẠN" name="tinh_trang" required>
                  <option value="BẠN">BẠN</option><option value="BÀN">BÀN</option><option value="BÁN">BÁN</option><option value="BÁM">BÁM</option>
                </select>
              </label>
              <label><span className="field-label">Nhóm tính cách <span aria-hidden="true" className="required-indicator">*</span></span>
                <select defaultValue="D" name="nhom_tinh_cach" required>
                  <option value="D">D</option><option value="I">I</option><option value="S">S</option><option value="C">C</option>
                </select>
              </label>
            </div>
          </fieldset>
          <div className="form-actions"><PendingSubmitButton pendingLabel="Đang lưu khách hàng…">Lưu khách hàng</PendingSubmitButton></div>
        </GuardedForm>
      </section>
    </main>
  );
}
