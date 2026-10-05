import Link from "next/link";

import { deleteActivity } from "@/app/activities/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type ActivitiesPageProps = {
  searchParams: Promise<{ loai?: string; status?: string; error?: string }>;
};

export default async function ActivitiesPage({
  searchParams,
}: ActivitiesPageProps) {
  const query = await searchParams;
  const { supabase, accountId } = await requireBusinessAccount();
  const [activityResult, accountResult] = await Promise.all([
    supabase
      .from("hoat_dong")
      .select(
        "id,tai_khoan_id,loai_hoat_dong,dia_diem,thoi_gian,so_khach_hang_ket_noi",
      )
      .order("thoi_gian", { ascending: false }),
    supabase.from("tai_khoan").select("id,ho_ten,ma_dai_ly"),
  ]);

  if (activityResult.error || accountResult.error) {
    throw new Error("Không thể tải lịch sử hoạt động.");
  }

  const names = new Map(
    (accountResult.data ?? []).map((account) => [
      account.id,
      \`\${account.ho_ten} (\${account.ma_dai_ly})\`,
    ]),
  );
  const activities = (activityResult.data ?? []).filter(
    (activity) => !query.loai || activity.loai_hoat_dong === query.loai,
  );

  return (
    <main>
      <section className="card wide-card">
        <h1>Hoạt động kinh doanh</h1>
        <div className="actions">
          <Link href="/dashboard">Dashboard</Link>
          <Link className="button-link" href="/activities/new">
            Tạo hoạt động
          </Link>
        </div>
        {query.status ? (
          <p className="message success">Đã cập nhật hoạt động.</p>
        ) : null}
        {query.error ? (
          <p className="message error">Không thể xử lý hoạt động.</p>
        ) : null}

        <form className="filter-grid" method="get">
          <label>
            Loại hoạt động
            <select defaultValue={query.loai ?? ""} name="loai">
              <option value="">Tất cả</option>
              <option value="KHẢO_SÁT">Khảo sát</option>
              <option value="GẶP_GỠ">Gặp gỡ</option>
              <option value="TƯ_VẤN">Tư vấn</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>

        <div className="stack">
          {activities.length === 0 ? <p>Chưa có hoạt động phù hợp.</p> : null}
          {activities.map((activity) => {
            const owned = activity.tai_khoan_id === accountId;
            return (
              <article className="card" key={activity.id}>
                <p>
                  <strong>{activity.loai_hoat_dong}</strong> —{" "}
                  {names.get(activity.tai_khoan_id) ?? activity.tai_khoan_id}
                </p>
                <p>{activity.dia_diem}</p>
                <p className="secondary-text">
                  {new Date(activity.thoi_gian).toLocaleString("vi-VN")} ·{" "}
                  {activity.so_khach_hang_ket_noi} khách hàng kết nối
                </p>
                {owned ? (
                  <div className="actions">
                    <Link href={\`/activities/\${activity.id}/edit\`}>
                      Chỉnh sửa
                    </Link>
                    <form action={deleteActivity}>
                      <input
                        name="activity_id"
                        type="hidden"
                        value={activity.id}
                      />
                      <button type="submit">Xóa</button>
                    </form>
                  </div>
                ) : (
                  <p className="secondary-text">Chỉ xem hoạt động cấp dưới.</p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
