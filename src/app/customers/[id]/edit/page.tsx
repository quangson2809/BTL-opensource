import Link from "next/link";
import { notFound } from "next/navigation";
import { GuardedForm } from "@/components/guarded-form";

import { ActionFeedback } from "@/components/action-feedback";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { updateCustomer } from "@/app/customers/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditCustomerPage({ params, searchParams }: EditCustomerPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, accountId } = await requireBusinessAccount();
  const { data: customer, error } = await supabase.from("khach_hang").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error("Không thể tải khách hàng.");
  if (!customer) notFound();

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Chỉnh sửa khách hàng"
          description={"Cập nhật hồ sơ · " + customer.ma_khach_hang}
          actions={<Link className="button-link button-secondary" href={"/customers/" + customer.id}>Quay lại chi tiết</Link>}
        />
        {query.error ? <ActionFeedback error={query.error} /> : null}
        <FormDraftPersistence persistKey={"customer-edit-" + customer.id} scopeKey={accountId} hasError={Boolean(query.error)} />
        <p className="form-required-note"><span aria-hidden="true">*</span> Các trường trong biểu mẫu đều bắt buộc.</p>
        <GuardedForm action={updateCustomer} className="stack form-layout" data-persist-key={"customer-edit-" + customer.id}>
          <input name="customer_id" type="hidden" value={customer.id} />
          <fieldset className="form-section">
            <legend>Thông tin cơ bản</legend>
            <div className="form-grid">
              <label><span className="field-label">Mã khách hàng <span aria-hidden="true" className="required-indicator">*</span></span><input defaultValue={customer.ma_khach_hang} name="ma_khach_hang" required /></label>
              <label><span className="field-label">Họ tên <span aria-hidden="true" className="required-indicator">*</span></span><input autoComplete="name" defaultValue={customer.ho_ten} name="ho_ten" required /></label>
              <label><span className="field-label">Số điện thoại <span aria-hidden="true" className="required-indicator">*</span></span><input autoComplete="tel" defaultValue={customer.so_dien_thoai} name="so_dien_thoai" required /></label>
              <label><span className="field-label">Giới tính <span aria-hidden="true" className="required-indicator">*</span></span><input defaultValue={customer.gioi_tinh} name="gioi_tinh" required /></label>
              <label><span className="field-label">Ngày sinh <span aria-hidden="true" className="required-indicator">*</span></span><input defaultValue={customer.ngay_sinh} name="ngay_sinh" required type="date" /></label>
              <label><span className="field-label">Địa chỉ <span aria-hidden="true" className="required-indicator">*</span></span><input autoComplete="street-address" defaultValue={customer.dia_chi} name="dia_chi" required /></label>
            </div>
          </fieldset>
          <fieldset className="form-section">
            <legend>Thông tin hồ sơ</legend>
            <div className="form-grid">
              <label><span className="field-label">Sở thích <span aria-hidden="true" className="required-indicator">*</span></span><textarea defaultValue={customer.so_thich} name="so_thich" required /></label>
              <label><span className="field-label">Ghi chú <span aria-hidden="true" className="required-indicator">*</span></span><textarea defaultValue={customer.ghi_chu} name="ghi_chu" required /></label>
              <label><span className="field-label">Loại khách hàng <span aria-hidden="true" className="required-indicator">*</span></span>
                <select defaultValue={customer.loai_khach_hang} name="loai_khach_hang" required>
                  <option value="MUC_TIEU">Mục tiêu</option><option value="NUOI_DUONG">Nuôi dưỡng</option><option value="DOI_TAC">Đối tác</option>
                </select>
              </label>
              <label><span className="field-label">Tình trạng <span aria-hidden="true" className="required-indicator">*</span></span>
                <select defaultValue={customer.tinh_trang} name="tinh_trang" required>
                  <option value="BẠN">BẠN</option><option value="BÀN">BÀN</option><option value="BÁN">BÁN</option><option value="BÁM">BÁM</option>
                </select>
              </label>
              <label><span className="field-label">Nhóm tính cách <span aria-hidden="true" className="required-indicator">*</span></span>
                <select defaultValue={customer.nhom_tinh_cach} name="nhom_tinh_cach" required>
                  <option value="D">D</option><option value="I">I</option><option value="S">S</option><option value="C">C</option>
                </select>
              </label>
            </div>
          </fieldset>
          <div className="form-actions"><PendingSubmitButton pendingLabel="Đang lưu thay đổi…">Lưu thay đổi</PendingSubmitButton></div>
        </GuardedForm>
      </section>
    </main>
  );
}
