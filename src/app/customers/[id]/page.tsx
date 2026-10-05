import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteCustomer } from "@/app/customers/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase } = await requireBusinessAccount();
  const { data: customer, error } = await supabase
    .from("khach_hang")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Không thể tải khách hàng.");
  }
  if (!customer) {
    notFound();
  }

  return (
    <main>
      <section className="card wide-card">
        <h1>{customer.ho_ten}</h1>
        <div className="actions">
          <Link href="/customers">Danh sách khách hàng</Link>
          <Link href={\`/customers/\${customer.id}/edit\`}>Chỉnh sửa</Link>
        </div>
        {query.status === "created" ? (
          <p className="message success">Đã tạo khách hàng.</p>
        ) : null}
        {query.status === "updated" ? (
          <p className="message success">Đã cập nhật khách hàng.</p>
        ) : null}
        {query.error ? (
          <p className="message error">Không thể xử lý yêu cầu.</p>
        ) : null}

        <div className="details-grid">
          <p>Mã: {customer.ma_khach_hang}</p>
          <p>Số điện thoại: {customer.so_dien_thoai}</p>
          <p>Giới tính: {customer.gioi_tinh}</p>
          <p>Ngày sinh: {customer.ngay_sinh}</p>
          <p>Địa chỉ: {customer.dia_chi}</p>
          <p>Loại: {customer.loai_khach_hang}</p>
          <p>Tình trạng: {customer.tinh_trang}</p>
          <p>Nhóm tính cách: {customer.nhom_tinh_cach}</p>
          <p>Sở thích: {customer.so_thich}</p>
          <p>Ghi chú: {customer.ghi_chu}</p>
        </div>

        <form action={deleteCustomer}>
          <input name="customer_id" type="hidden" value={customer.id} />
          <button type="submit">Xóa khách hàng</button>
        </form>
      </section>
    </main>
  );
}
