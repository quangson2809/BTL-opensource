import Link from "next/link";

import { createActivity } from "@/app/activities/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type NewActivityPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewActivityPage({
  searchParams,
}: NewActivityPageProps) {
  const query = await searchParams;
  await requireBusinessAccount();

  return (
    <main>
      <section className="card wide-card">
        <h1>Tạo hoạt động</h1>
        <p>
          <Link href="/activities">Quay lại lịch sử</Link>
        </p>
        {query.error ? (
          <p className="message error">Dữ liệu hoạt động không hợp lệ.</p>
        ) : null}
        <form action={createActivity} className="stack">
          <label>
            Loại hoạt động
            <select defaultValue="KHẢO_SÁT" name="loai_hoat_dong" required>
              <option value="KHẢO_SÁT">Khảo sát</option>
              <option value="GẶP_GỠ">Gặp gỡ</option>
              <option value="TƯ_VẤN">Tư vấn</option>
            </select>
          </label>
          <label>
            Địa điểm
            <input name="dia_diem" required />
          </label>
          <label>
            Thời gian
            <input name="thoi_gian" required type="datetime-local" />
          </label>
          <label>
            Số khách hàng kết nối
            <input
              min="0"
              name="so_khach_hang_ket_noi"
              required
              type="number"
            />
          </label>
          <button type="submit">Lưu hoạt động</button>
        </form>
      </section>
    </main>
  );
}
