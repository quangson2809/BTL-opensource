import Link from "next/link";
import { notFound } from "next/navigation";

import { GuardedForm } from "@/components/guarded-form";
import { FormDraftClear } from "@/components/form-draft-clear";
import { ActionFeedback } from "@/components/action-feedback";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { deleteCustomer } from "@/app/customers/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function CustomerDetailPage({ params, searchParams }: CustomerDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, accountId } = await requireBusinessAccount();
  const { data: customer, error } = await supabase.from("khach_hang").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error("Không thể tải khách hàng.");
  if (!customer) notFound();

  return (
    <main>
      <section className="page-content customer-detail-page">
        <PageHeader
          title={customer.ho_ten}
          description={"Hồ sơ khách hàng · " + customer.ma_khach_hang}
          actions={
            <>
              <Link className="button-link button-secondary" href="/customers">Danh sách khách hàng</Link>
              <Link className="button-link" href={"/customers/" + customer.id + "/edit"}>Chỉnh sửa</Link>
            </>
          }
        />
        <FormDraftClear scopeKey={accountId} persistKeys={["customer-create", "customer-edit-" + customer.id]} clearOn={query.status === "created" || query.status === "updated"} />
        {query.status ? <ActionFeedback status={query.status} /> : null}
        {query.error ? <ActionFeedback error={query.error} /> : null}
        <section className="detail-section" aria-labelledby="customer-primary-title">
          <h2 id="customer-primary-title">Thông tin cơ bản</h2>
          <dl className="details-grid account-details-grid">
            <div><dt>Mã khách hàng</dt><dd>{customer.ma_khach_hang}</dd></div>
            <div><dt>Số điện thoại</dt><dd>{customer.so_dien_thoai}</dd></div>
            <div><dt>Giới tính</dt><dd>{customer.gioi_tinh}</dd></div>
            <div><dt>Ngày sinh</dt><dd>{customer.ngay_sinh}</dd></div>
            <div><dt>Địa chỉ</dt><dd>{customer.dia_chi}</dd></div>
            <div><dt>Loại khách hàng</dt><dd>{customer.loai_khach_hang}</dd></div>
            <div><dt>Tình trạng</dt><dd><StatusBadge value={customer.tinh_trang} /></dd></div>
            <div><dt>Nhóm tính cách</dt><dd>{customer.nhom_tinh_cach}</dd></div>
          </dl>
        </section>
        <section className="detail-section" aria-labelledby="customer-notes-title">
          <h2 id="customer-notes-title">Sở thích và ghi chú</h2>
          <dl className="details-grid account-details-grid">
            <div><dt>Sở thích</dt><dd>{customer.so_thich}</dd></div>
            <div><dt>Ghi chú</dt><dd>{customer.ghi_chu}</dd></div>
          </dl>
        </section>
        <GuardedForm action={deleteCustomer} className="form-actions">
          <input name="customer_id" type="hidden" value={customer.id} />
          <PendingSubmitButton
            confirmMessage="Bạn có chắc muốn xóa hồ sơ khách hàng này? Thao tác không thể hoàn tác."
            pendingLabel="Đang xóa khách hàng…"
          >
            Xóa khách hàng
          </PendingSubmitButton>
        </GuardedForm>
      </section>
    </main>
  );
}
