import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveAccount,
  assignRole,
  lockAccount,
  revokeRole,
  unlockAccount,
} from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  approved: "Đã phê duyệt tài khoản.",
  locked: "Đã khóa tài khoản.",
  unlocked: "Đã mở khóa tài khoản.",
  "role-assigned": "Đã gán vai trò.",
  "role-revoked": "Đã thu hồi vai trò.",
};

const errorMessages: Record<string, string> = {
  approve: "Không thể phê duyệt tài khoản ở trạng thái hiện tại.",
  lock: "Không thể khóa tài khoản ở trạng thái hiện tại.",
  unlock: "Không thể mở khóa tài khoản ở trạng thái hiện tại.",
  "assign-role": "Không thể gán vai trò.",
  "revoke-role": "Không thể thu hồi vai trò.",
};

type AccountDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function AccountDetailPage({
  params,
  searchParams,
}: AccountDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();

  const [accountResult, assignmentResult, roleResult] = await Promise.all([
    supabase
      .from("tai_khoan")
      .select(
        "id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai,dang_nhap_sai_lien_tiep,khoa_tam_den,created_at,updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("phan_cong_vai_tro")
      .select("vai_tro_id")
      .eq("tai_khoan_id", id),
    supabase
      .from("vai_tro")
      .select("id,ma_vai_tro,ten_vai_tro")
      .order("ma_vai_tro"),
  ]);

  if (accountResult.error || assignmentResult.error || roleResult.error) {
    throw new Error("Không thể tải chi tiết tài khoản.");
  }

  if (!accountResult.data) {
    notFound();
  }

  const account = accountResult.data;
  const assignedRoleIds = new Set(
    (assignmentResult.data ?? []).map((assignment) => assignment.vai_tro_id),
  );
  const statusMessage = query.status ? statusMessages[query.status] : undefined;
  const errorMessage = query.error ? errorMessages[query.error] : undefined;

  return (
    <main>
      <section className="card">
        <h1>{account.ho_ten}</h1>
        <div className="actions">
          <Link href="/admin/accounts">Danh sách tài khoản</Link>
          <Link href="/admin/roles">Vai trò & quyền</Link>
        </div>

        {statusMessage ? <p className="message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="stack">
          <div>
            <p>Email: {account.email}</p>
            <p>Số điện thoại: {account.so_dien_thoai}</p>
            <p>Mã đại lý: {account.ma_dai_ly}</p>
            <p>Trạng thái: {account.trang_thai}</p>
            <p>Manager ID: {account.manager_id ?? "—"}</p>
            <p>Số lần đăng nhập sai liên tiếp: {account.dang_nhap_sai_lien_tiep}</p>
            <p>Khóa tạm đến: {account.khoa_tam_den ?? "—"}</p>
          </div>

          <div>
            <h2>Trạng thái tài khoản</h2>
            {account.trang_thai === "CHO_PHE_DUYET" ? (
              <form action={approveAccount}>
                <input name="account_id" type="hidden" value={account.id} />
                <button type="submit">Phê duyệt</button>
              </form>
            ) : null}
            {account.trang_thai === "DANG_HOAT_DONG" ? (
              <form action={lockAccount}>
                <input name="account_id" type="hidden" value={account.id} />
                <button type="submit">Khóa tài khoản</button>
              </form>
            ) : null}
            {account.trang_thai === "KHOA" ? (
              <form action={unlockAccount}>
                <input name="account_id" type="hidden" value={account.id} />
                <button type="submit">Mở khóa tài khoản</button>
              </form>
            ) : null}
          </div>

          <div>
            <h2>Vai trò</h2>
            <div className="stack">
              {(roleResult.data ?? []).map((role) => {
                const assigned = assignedRoleIds.has(role.id);
                return (
                  <div key={role.id}>
                    <p>
                      <strong>{role.ma_vai_tro}</strong> — {role.ten_vai_tro}
                    </p>
                    <form action={assigned ? revokeRole : assignRole}>
                      <input name="account_id" type="hidden" value={account.id} />
                      <input name="role_id" type="hidden" value={role.id} />
                      <button type="submit">
                        {assigned ? "Thu hồi vai trò" : "Gán vai trò"}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
