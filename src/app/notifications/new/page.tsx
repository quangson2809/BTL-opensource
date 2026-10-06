import Link from "next/link";

import { createNotification } from "@/app/notifications/actions";
import { requireDm } from "@/lib/business";

export const dynamic = "force-dynamic";

type NewNotificationPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewNotificationPage({
  searchParams,
}: NewNotificationPageProps) {
  const query = await searchParams;
  const { supabase, accountId } = await requireDm();
  const { data: recipients, error } = await supabase
    .from("tai_khoan")
    .select("id,ho_ten,ma_dai_ly,trang_thai")
    .neq("id", accountId)
    .order("ho_ten");

  if (error) {
    throw new Error("Không thể tải người nhận trong scope.");
  }

  return (
    <main>
      <section className="card wide-card">
        <h1>Tạo thông báo</h1>
        <p>
          <Link href="/notifications">Quay lại thông báo</Link>
        </p>
        {query.error ? (
          <p className="message error">Không thể tạo thông báo.</p>
        ) : null}
        <form action={createNotification} className="stack">
          <label>
            Tiêu đề
            <input name="tieu_de" required />
          </label>
          <label>
            Nội dung
            <textarea name="noi_dung" required />
          </label>
          <label>
            Loại
            <select defaultValue="TIN_TỨC" name="loai" required>
              <option value="TIN_TỨC">Tin tức</option>
              <option value="TỰ_ĐỘNG_HỆ_THỐNG">Tự động hệ thống</option>
            </select>
          </label>
          <label>
            Người nhận trong scope
            <select
              multiple
              name="recipient_ids"
              required
              size={Math.min(Math.max((recipients ?? []).length, 3), 10)}
            >
              {(recipients ?? []).map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.ho_ten} — {recipient.ma_dai_ly} —{" "}
                  {recipient.trang_thai}
                </option>
              ))}
            </select>
          </label>
          <p className="secondary-text">
            Giữ Ctrl/Cmd để chọn nhiều người nhận. Draft chưa hiển thị cho người
            nhận cho đến khi DM bấm gửi.
          </p>
          <button type="submit">Tạo bản nháp</button>
        </form>
      </section>
    </main>
  );
}
