import Link from "next/link";

import { createCustomer } from "@/app/customers/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type NewCustomerPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewCustomerPage({
  searchParams,
}: NewCustomerPageProps) {
  const query = await searchParams;
  await requireBusinessAccount();

  return (
    <main>
      <section className="card wide-card">
        <h1>Thêm khách hàng</h1>
        <p>
          <Link href="/customers">Quay lại danh sách</Link>
        </p>
        {query.error ? (
          <p className="message error">Dữ liệu không hợp lệ hoặc bị trùng.</p>
        ) : null}
        <form action={createCustomer} className="stack">
          <label>
            Mã khách hàng
            <input name="ma_khach_hang" required />
          </label>
          <label>
            Họ tên
            <input name="ho_ten" required />
          </label>
          <label>
            Số điện thoại
            <input name="so_dien_thoai" required />
          </label>
          <label>
            Giới tính
            <input name="gioi_tinh" required />
          </label>
          <label>
            Ngày sinh
            <input name="ngay_sinh" required type="date" />
          </label>
          <label>
            Địa chỉ
            <input name="dia_chi" required />
          </label>
          <label>
            Sở thích
            <textarea name="so_thich" required />
          </label>
          <label>
            Ghi chú
            <textarea name="ghi_chu" required />
          </label>
          <label>
            Loại khách hàng
            <select defaultValue="MUC_TIEU" name="loai_khach_hang" required>
              <option value="MUC_TIEU">Mục tiêu</option>
              <option value="NUOI_DUONG">Nuôi dưỡng</option>
              <option value="DOI_TAC">Đối tác</option>
            </select>
          </label>
          <label>
            Tình trạng
            <select defaultValue="BẠN" name="tinh_trang" required>
              <option value="BẠN">BẠN</option>
              <option value="BÀN">BÀN</option>
              <option value="BÁN">BÁN</option>
              <option value="BÁM">BÁM</option>
            </select>
          </label>
          <label>
            Nhóm tính cách
            <select defaultValue="D" name="nhom_tinh_cach" required>
              <option value="D">D</option>
              <option value="I">I</option>
              <option value="S">S</option>
              <option value="C">C</option>
            </select>
          </label>
          <button type="submit">Lưu khách hàng</button>
        </form>
      </section>
    </main>
  );
}
