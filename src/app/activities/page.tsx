import Link from "next/link";

import { GuardedForm } from "@/components/guarded-form";
import { FormDraftClear } from "@/components/form-draft-clear";
import { ActionFeedback } from "@/components/action-feedback";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ListPagination, ResultSummary } from "@/components/list-controls";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import { deleteActivity } from "@/app/activities/actions";
import { requireBusinessAccount } from "@/lib/business";
import { parsePositivePage } from "@/lib/list-query.mjs";

export const dynamic = "force-dynamic";

type ActivitiesPageProps = {
  searchParams: Promise<{ loai?: string; status?: string; error?: string; page?: string; id?: string }>;
};

const activityTypes = new Set(["KHẢO_SÁT", "GẶP_GỠ", "TƯ_VẤN"]);

export default async function ActivitiesPage({
  searchParams,
}: ActivitiesPageProps) {
  const query = await searchParams;
  const { supabase, accountId } = await requireBusinessAccount();
  const type = query.loai && activityTypes.has(query.loai) ? query.loai : "";

  let countQuery = supabase
    .from("hoat_dong")
    .select("id", { count: "exact", head: true });
  if (type) countQuery = countQuery.eq("loai_hoat_dong", type);

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error("Không thể đếm hoạt động trong phạm vi được cấp quyền.");
  }

  const total = count ?? 0;
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(parsePositivePage(query.page), pageCount);
  const firstRow = (currentPage - 1) * pageSize;

  let activityQuery = supabase
    .from("hoat_dong")
    .select("id,tai_khoan_id,loai_hoat_dong,dia_diem,thoi_gian,so_khach_hang_ket_noi")
    .order("thoi_gian", { ascending: false })
    .order("id", { ascending: true })
    .range(firstRow, firstRow + pageSize - 1);
  if (type) activityQuery = activityQuery.eq("loai_hoat_dong", type);

  const { data: activities, error } = await activityQuery;
  if (error) {
    throw new Error("Không thể tải lịch sử hoạt động.");
  }

  const visibleActivities = activities ?? [];
  const accountIds = [...new Set(visibleActivities.map((activity) => activity.tai_khoan_id))];
  const accountResult = accountIds.length > 0
    ? await supabase
        .from("tai_khoan")
        .select("id,ho_ten,ma_dai_ly")
        .in("id", accountIds)
    : { data: [], error: null };

  if (accountResult.error) {
    throw new Error("Không thể tải tên người thực hiện trong phạm vi được cấp quyền.");
  }

  const names = new Map(
    (accountResult.data ?? []).map((account) => [
      account.id,
      account.ho_ten + " (" + account.ma_dai_ly + ")",
    ]),
  );
  const filterParams = { loai: type };
  const hasFilters = Boolean(type);

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
        <FormDraftClear scopeKey={accountId} persistKeys={["activity-create", ...(query.id ? ["activity-edit-" + query.id] : [])]} clearOn={query.status === "created" || query.status === "updated"} />
        {query.status ? <ActionFeedback status={query.status} /> : null}
        {query.error ? <ActionFeedback error={query.error} /> : null}

        <form className="filter-grid" method="get">
          <label>
            Loại hoạt động
            <select defaultValue={type} name="loai">
              <option value="">Tất cả</option>
              <option value="KHẢO_SÁT">Khảo sát</option>
              <option value="GẶP_GỠ">Gặp gỡ</option>
              <option value="TƯ_VẤN">Tư vấn</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </GuardedForm>

        <ResultSummary label="hoạt động" total={total} currentPage={currentPage} pageSize={pageSize} hasFilters={hasFilters} clearHref="/activities" />

        <div className="stack">
          {total === 0 ? (
            <EmptyState
              actionHref={!hasFilters ? "/activities/new" : undefined}
              actionLabel={!hasFilters ? "Tạo hoạt động đầu tiên" : undefined}
              description={
                !hasFilters
                  ? "Tạo một bản ghi hoạt động để bắt đầu lưu lịch sử."
                  : "Thử chọn loại hoạt động khác để mở rộng kết quả."
              }
              title={!hasFilters ? "Chưa có hoạt động" : "Không tìm thấy kết quả"}
            />
          ) : null}
          {visibleActivities.map((activity) => {
            const owned = activity.tai_khoan_id === accountId;
            return (
              <article className="record-row" key={activity.id}>
                <p>
                  <strong>{activity.loai_hoat_dong}</strong> <StatusBadge value={activity.loai_hoat_dong} /> —{" "}
                  {names.get(activity.tai_khoan_id) ?? "Người thực hiện trong scope"}
                </p>
                <p>{activity.dia_diem}</p>
                <p className="secondary-text">
                  {new Date(activity.thoi_gian).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} ·{" "}
                  {activity.so_khach_hang_ket_noi} khách hàng kết nối
                </p>
                {owned ? (
                  <div className="actions">
                    <Link href={"/activities/" + activity.id + "/edit"}>Chỉnh sửa</Link>
                    <GuardedForm action={deleteActivity}>
                      <input name="activity_id" type="hidden" value={activity.id} />
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
        <ListPagination basePath="/activities" currentPage={currentPage} pageCount={pageCount} params={filterParams} />
      </section>
    </main>
  );
}
