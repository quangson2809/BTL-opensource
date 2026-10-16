import Link from "next/link";

import { ActionFeedback } from "@/components/action-feedback";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";

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
      account.ho_ten + " (" + account.ma_dai_ly + ")",
    ]),
  );
  const allActivities = activityResult.data ?? [];
  const activities = allActivities.filter(
    (activity) => !query.loai || activity.loai_hoat_dong === query.loai,
  );

  return (
    <main>
      <section className="card wide-card">
        <PageHeader
          actions={
            <Link className="button-link" href="/activities/new">
              Tạo hoạt động
            </Link>
          }
          description="Theo dõi lịch sử hoạt động theo phạm vi dữ liệu được cấp quyền."
          title="Hoạt động kinh doanh"
        />
        {query.status ? <ActionFeedback status={query.status} /> : null}
        {query.error ? <ActionFeedback error={query.error} /> : null}

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
          {activities.length === 0 ? (
            <EmptyState
              actionHref={allActivities.length === 0 ? "/activities/new" : undefined}
              actionLabel={allActivities.length === 0 ? "Tạo hoạt động đầu tiên" : undefined}
              description={
                allActivities.length === 0
                  ? "Tạo một bản ghi hoạt động để bắt đầu lưu lịch sử."
                  : "Thử chọn loại hoạt động khác để mở rộng kết quả."
              }
              title={allActivities.length === 0 ? "Chưa có hoạt động" : "Không tìm thấy kết quả"}
            />
          ) : null}
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
                  {new Date(activity.thoi_gian).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} ·{" "}
                  {activity.so_khach_hang_ket_noi} khách hàng kết nối
                </p>
                {owned ? (
                  <div className="actions">
                    <Link href={"/activities/" + activity.id + "/edit"}>
                      Chỉnh sửa
                    </Link>
                    <form action={deleteActivity}>
                      <input
                        name="activity_id"
                        type="hidden"
                        value={activity.id}
                      />
                      <PendingSubmitButton
                        confirmMessage="Bạn có chắc muốn xóa hoạt động này?"
                        pendingLabel="Đang xóa…"
                      >
                        Xóa
                      </PendingSubmitButton>
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
