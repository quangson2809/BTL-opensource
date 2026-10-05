import Link from "next/link";
import { notFound } from "next/navigation";

import { updateActivity } from "@/app/activities/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type EditActivityPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default async function EditActivityPage({
  params,
  searchParams,
}: EditActivityPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, accountId } = await requireBusinessAccount();
  const { data: activity, error } = await supabase
    .from("hoat_dong")
    .select(
      "id,tai_khoan_id,loai_hoat_dong,dia_diem,thoi_gian,so_khach_hang_ket_noi",
    )
    .eq("id", id)
    .eq("tai_khoan_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error("Không thể tải hoạt động.");
  }
  if (!activity) {
    notFound();
  }

  return (
    <main>
      <section className="card wide-card">
        <h1>Chỉnh sửa hoạt động</h1>
        <p>
          <Link href="/activities">Quay lại lịch sử</Link>
        </p>
        {query.error ? (
          <p className="message error">Không thể cập nhật hoạt động.</p>
        ) : null}
        <form action={updateActivity} className="stack">
          <input name="activity_id" type="hidden" value={activity.id} />
          <label>
            Loại hoạt động
            <select
              defaultValue={activity.loai_hoat_dong}
              name="loai_hoat_dong"
            >
              <option value="KHẢO_SÁT">Khảo sát</option>
              <option value="GẶP_GỠ">Gặp gỡ</option>
              <option value="TƯ_VẤN">Tư vấn</option>
            </select>
          </label>
          <label>
            Địa điểm
            <input defaultValue={activity.dia_diem} name="dia_diem" required />
          </label>
          <label>
            Thời gian
            <input
              defaultValue={localDateTime(activity.thoi_gian)}
              name="thoi_gian"
              required
              type="datetime-local"
            />
          </label>
          <label>
            Số khách hàng kết nối
            <input
              defaultValue={activity.so_khach_hang_ket_noi}
              min="0"
              name="so_khach_hang_ket_noi"
              required
              type="number"
            />
          </label>
          <button type="submit">Lưu thay đổi</button>
        </form>
      </section>
    </main>
  );
}
