import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/input-validation.mjs";
import { PageHeader } from "@/components/page-header";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { GuardedForm } from "@/components/guarded-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SearchableCheckboxPicker } from "@/components/searchable-checkbox-picker";
import { createAccount } from "./actions";

export const dynamic = "force-dynamic";
const errors: Record<string, string> = {
  invalid: "Kiểm tra hồ sơ, mật khẩu, vai trò và người quản lý. Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường và chữ số.",
  duplicate: "Email, số điện thoại hoặc mã đại lý đã được sử dụng.",
  forbidden: "Bạn không có quyền thực hiện yêu cầu tạo tài khoản này.",
  service: "Chưa thể hoàn tất tạo tài khoản. Bạn có thể thử lại cùng yêu cầu.",
  cleanup: "Yêu cầu chưa hoàn tất và cần kiểm tra trạng thái. Hãy giữ trang này để thử lại cùng yêu cầu hoặc liên hệ người vận hành.",
};

export default async function NewAccountPage({ searchParams }: { searchParams: Promise<{ error?: string; request?: string }> }) {
  const query = await searchParams;
  const { supabase, accountId } = await requireAdmin();
  const [roleResult, accountResult, assignmentResult] = await Promise.all([
    supabase.from("vai_tro").select("id,ma_vai_tro,ten_vai_tro").order("ma_vai_tro"),
    supabase.from("tai_khoan").select("id,ho_ten,ma_dai_ly").eq("trang_thai", "DANG_HOAT_DONG").order("ho_ten"),
    supabase.from("phan_cong_vai_tro").select("tai_khoan_id,vai_tro_id"),
  ]);
  if (roleResult.error || accountResult.error || assignmentResult.error) throw new Error("Không thể tải tùy chọn tạo tài khoản.");
  const managerRoles = new Set((roleResult.data ?? []).filter((role) => ["DM", "UM"].includes(role.ma_vai_tro)).map((role) => role.id));
  const managerIds = new Set((assignmentResult.data ?? []).filter((assignment) => managerRoles.has(assignment.vai_tro_id)).map((assignment) => assignment.tai_khoan_id));
  const requestId = query.request && isUuid(query.request) ? query.request : randomUUID();
  return <main><section className="page-content">
    <PageHeader title="Tạo tài khoản" description="Tài khoản do Admin tạo sẽ hoạt động ngay với vai trò và phạm vi được gán." actions={<Link href="/admin/accounts">Quay lại tài khoản</Link>} />
    {query.error ? <p role="alert" className="message error">{errors[query.error] ?? errors.service}</p> : null}
    <FormDraftPersistence persistKey="admin-account-create" scopeKey={accountId} hasError={Boolean(query.error)} />
    <GuardedForm action={createAccount} className="stack" data-persist-key="admin-account-create">
      <input name="request_id" type="hidden" value={requestId} />
      <fieldset className="form-section"><legend>Thông tin tài khoản</legend><div className="form-grid">
        <label>Họ tên<input name="ho_ten" required autoComplete="off" /></label>
        <label>Email<input name="email" type="email" required autoComplete="off" /></label>
        <label>Số điện thoại<input name="so_dien_thoai" type="tel" required autoComplete="off" /></label>
        <label>Mã đại lý<input name="ma_dai_ly" required autoComplete="off" /></label>
        <label>Mật khẩu ban đầu<input name="password" type="password" required minLength={8} autoComplete="new-password" aria-describedby="initial-password-help" /></label>
        <label>Người quản lý trực tiếp<select name="manager_id" defaultValue="">
          <option value="">Không có (chỉ tài khoản ADMIN hoặc DM)</option>
          {(accountResult.data ?? []).filter((account) => managerIds.has(account.id)).map((account) => <option value={account.id} key={account.id}>{account.ho_ten} — {account.ma_dai_ly}</option>)}
        </select></label>
      </div><p id="initial-password-help" className="field-help">Ít nhất 8 ký tự, có chữ hoa, chữ thường và chữ số. Mật khẩu không được lưu trong bản nháp. Chuyển mật khẩu cho người dùng qua kênh an toàn.</p></fieldset>
      <fieldset className="form-section"><legend>Vai trò được gán</legend>
        <SearchableCheckboxPicker name="role_ids" options={(roleResult.data ?? []).map((role) => ({ id: role.id, label: role.ma_vai_tro + " — " + role.ten_vai_tro }))} searchLabel="Tìm vai trò" searchPlaceholder="Mã hoặc tên vai trò" selectedCountLabel="vai trò" emptyMessage="Chưa có vai trò." noResultsMessage="Không tìm thấy vai trò." required />
      </fieldset>
      <PendingSubmitButton pendingLabel="Đang tạo tài khoản…">Tạo tài khoản</PendingSubmitButton>
    </GuardedForm>
  </section></main>;
}
