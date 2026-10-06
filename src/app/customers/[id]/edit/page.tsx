import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCustomer } from "@/app/customers/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditCustomerPage({
  params,
  searchParams,
}: EditCustomerPageProps) {
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
        <h1>Chỉnh sửa khách hàng</h1>
        <p>
          <Link href={`/customers/${customer.id}`}>Quay lại chi tiết</Link>
        </p>
        {query.error ? (
          <p className="message error">Không thể cập nhật dữ liệu.</p>
        ) : null}
        <form action={updateCustomer} className="stack">
          <input name="customer_id" type="hidden" value={customer.id} />
          <label>
            Mã khách hàng
            <input defaultValue={customer.ma_khach_hang} name="ma_khach_hang" required />
          </label>
          <label>
            Họ tên
            <input defaultValue={customer.ho_ten} name="ho_ten" required />
          </label>
          <label>
            Số điện thoại
            <input
              defaultValue={customer.so_dien_thoai}
              name="so_dien_thoai"
              required
            />
          </label>
          <label>
            Giới tính
            <input defaultValue={customer.gioi_tinh} name="gioi_tinh" required />
          </label>
          <label>
            Ngày sinh
            <input
              defaultValue={customer.ngay_sinh}
              name="ngay_sinh"
              required
              type="date"
            />
          </label>
          <label>
            Địa chỉ
            <input defaultValue={customer.dia_chi} name="dia_chi" required />
          </label>
          <label>
            Sở thích
            <textarea defaultValue={customer.so_thich} name="so_thich" required />
          </label>
          <label>
            Ghi chú
            <textarea defaultValue={customer.ghi_chu} name="ghi_chu" required />
          </label>
          <label>
            Loại khách hàng
            <select
              defaultValue={customer.loai_khach_hang}
              name="loai_khach_hang"
            >
              <option value="MUC_TIEU">Mục tiêu</option>
              <option value="NUOI_DUONG">Nuôi dưỡng</option>
              <option value="DOI_TAC">Đối tác</option>
            </select>
          </label>
          <label>
            Tình trạng
            <select defaultValue={customer.tinh_trang} name="tinh_trang">
              <option value="BẠN">BẠN</option>
              <option value="BÀN">BÀN</option>
              <option value="BÁN">BÁN</option>
              <option value="BÁM">BÁM</option>
            </select>
          </label>
          <label>
            Nhóm tính cách
            <select defaultValue={customer.nhom_tinh_cach} name="nhom_tinh_cach">
              <option value="D">D</option>
              <option value="I">I</option>
              <option value="S">S</option>
              <option value="C">C</option>
            </select>
          </label>
          <button type="submit">Lưu thay đổi</button>
        </form>
      </section>
    </main>
  );
}
