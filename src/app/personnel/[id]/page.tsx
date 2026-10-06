import Link from "next/link";
import { notFound } from "next/navigation";

import { requireManager } from "@/lib/business";

export const dynamic = "force-dynamic";

type PersonnelDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonnelDetailPage({
  params,
}: PersonnelDetailPageProps) {
  const { id } = await params;
  const { supabase } = await requireManager();
  const [accountResult, summaryResult] = await Promise.all([
    supabase
      .from("tai_khoan")
      .select(
        "id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.rpc("personnel_summary", { target_account_id: id }),
  ]);

  if (accountResult.error) {
    throw new Error("Không thể tải nhân sự.");
  }
  if (!accountResult.data) {
    notFound();
  }
  if (summaryResult.error) {
    throw new Error("Không thể tải thống kê nhân sự.");
  }

  const summary = summaryResult.data?.[0];

  return (
    <main>
      <section className="card wide-card">
        <h1>{accountResult.data.ho_ten}</h1>
        <p>
          <Link href="/personnel">Quay lại cây nhân sự</Link>
        </p>
        <div className="details-grid">
          <p>Email: {accountResult.data.email}</p>
          <p>Số điện thoại: {accountResult.data.so_dien_thoai}</p>
          <p>Mã đại lý: {accountResult.data.ma_dai_ly}</p>
          <p>Trạng thái: {accountResult.data.trang_thai}</p>
          <p>Khách hàng: {summary?.customer_count ?? 0}</p>
          <p>Hoạt động: {summary?.activity_count ?? 0}</p>
          <p>
            Tổng lượt khách hàng kết nối:{" "}
            {summary?.connected_customer_count ?? 0}
          </p>
        </div>
        <p className="secondary-text">
          Thống kê khách hàng chỉ là số tổng hợp; manager không được mở hoặc sửa
          hồ sơ khách hàng cấp dưới.
        </p>
      </section>
    </main>
  );
}
