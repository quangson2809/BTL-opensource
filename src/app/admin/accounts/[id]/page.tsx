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
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

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
  const { supabase, accountId: currentAccountId } = await requireAdmin();

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
      <section className="page-content account-detail-page">
        <PageHeader
          title={account.ho_ten}
          description={"Hồ sơ tài khoản · " + account.ma_dai_ly}
          actions={
            <>
              <Link className="button-link button-secondary" href="/admin/accounts">Danh sách tài khoản</Link>
              <Link className="button-link button-secondary" href="/admin/roles">Vai trò & quyền</Link>
            </>
          }
        />

        {statusMessage ? <p role="status" aria-live="polite" className="message success">{statusMessage}</p> : null}
        {errorMessage ? <p role="alert" aria-live="assertive" className="message error">{errorMessage}</p> : null}

        <div className="detail-section">
          <h2>Thông tin tài khoản</h2>
          <dl className="details-grid account-details-grid">
            <div><dt>Email</dt><dd>{account.email}</dd></div>
            <div><dt>Số điện thoại</dt><dd>{account.so_dien_thoai || "—"}</dd></div>
            <div><dt>Mã đại lý</dt><dd>{account.ma_dai_ly}</dd></div>
            <div><dt>Trạng thái</dt><dd><StatusBadge value={account.trang_thai} /></dd></div>
            <div><dt>Manager ID</dt><dd className="breakable-value">{account.manager_id ?? "—"}</dd></div>
            <div><dt>Số lần đăng nhập sai liên tiếp</dt><dd>{account.dang_nhap_sai_lien_tiep}</dd></div>
            <div><dt>Khóa tạm đến</dt><dd>{account.khoa_tam_den ?? "—"}</dd></div>
          </dl>
        </div>

        <div className="detail-section">
            <h2>Trạng thái tài khoản</h2>
            {account.trang_thai === "CHO_PHE_DUYET" ? (
              <form action={approveAccount}>
                <input name="account_id" type="hidden" value={account.id} />
                <PendingSubmitButton pendingLabel="Đang phê duyệt…">Phê duyệt</PendingSubmitButton>
              </form>
            ) : null}
            {account.trang_thai === "DANG_HOAT_DONG" && account.id !== currentAccountId ? (
              <form action={lockAccount}>
                <input name="account_id" type="hidden" value={account.id} />
                <PendingSubmitButton pendingLabel="Đang khóa…" confirmMessage="Bạn có chắc muốn khóa tài khoản này?">Khóa tài khoản</PendingSubmitButton>
              </form>
            ) : null}
            {account.trang_thai === "DANG_HOAT_DONG" && account.id === currentAccountId ? (
              <p className="field-help">Không thể tự khóa tài khoản quản trị đang sử dụng.</p>
            ) : null}
            {account.trang_thai === "KHOA" ? (
              <form action={unlockAccount}>
                <input name="account_id" type="hidden" value={account.id} />
                <PendingSubmitButton pendingLabel="Đang mở khóa…">Mở khóa tài khoản</PendingSubmitButton>
              </form>
            ) : null}
        </div>

        <div className="detail-section">
            <h2>Vai trò</h2>
            <div className="stack">
              {(roleResult.data ?? []).map((role) => {
                const assigned = assignedRoleIds.has(role.id);
                const protectedSelfAdmin =
                  assigned && role.ma_vai_tro === "ADMIN" && account.id === currentAccountId;
                return (
                  <article className="role-assignment" key={role.id}>
                    <p>
                      <strong>{role.ma_vai_tro}</strong> — {role.ten_vai_tro}
                    </p>
                    {protectedSelfAdmin ? (
                      <p className="field-help">Không thể tự thu hồi vai trò ADMIN đang sử dụng.</p>
                    ) : (
                      <form action={assigned ? revokeRole : assignRole}>
                        <input name="account_id" type="hidden" value={account.id} />
                        <input name="role_id" type="hidden" value={role.id} />
                        <PendingSubmitButton
                          pendingLabel={assigned ? "Đang thu hồi…" : "Đang gán…"}
                          confirmMessage={
                            assigned
                              ? "Bạn có chắc muốn thu hồi vai trò này?"
                              : "Bạn có chắc muốn gán vai trò này cho tài khoản?"
                          }
                        >
                          {assigned ? "Thu hồi vai trò" : "Gán vai trò"}
                        </PendingSubmitButton>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
        </div>
      </section>
    </main>
  );
}
