import Link from "next/link";
import { notFound } from "next/navigation";

import { DraftCancelLink } from "@/components/draft-cancel-link";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { GuardedForm } from "@/components/guarded-form";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import { updateRole } from "@/app/admin/roles/actions";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/input-validation.mjs";

export const dynamic = "force-dynamic";

const SYSTEM_ROLE_CODES = new Set(["ADMIN", "DM", "UM", "SA"]);

type EditRolePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Tên vai trò hoặc danh sách quyền không hợp lệ.",
  duplicate: "Tên vai trò đã tồn tại.",
  save: "Không thể cập nhật vai trò. Hãy kiểm tra dữ liệu rồi thử lại.",
};

export default async function EditRolePage({
  params,
  searchParams,
}: EditRolePageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const { supabase, accountId } = await requireAdmin();
  const [roleResult, permissionsResult, mappingResult] = await Promise.all([
    supabase
      .from("vai_tro")
      .select("id,ma_vai_tro,ten_vai_tro,mo_ta")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quyen")
      .select("id,ma_quyen,ten_quyen,mo_ta")
      .order("ma_quyen"),
    supabase
      .from("phan_quyen_vai_tro")
      .select("quyen_id")
      .eq("vai_tro_id", id),
  ]);

  if (roleResult.error) {
    throw new Error("Không thể tải vai trò cần chỉnh sửa.");
  }
  if (!roleResult.data || SYSTEM_ROLE_CODES.has(roleResult.data.ma_vai_tro)) {
    notFound();
  }
  if (permissionsResult.error || mappingResult.error) {
    throw new Error("Không thể tải thông tin vai trò và quyền hiện có.");
  }

  const selectedPermissionIds = new Set(
    (mappingResult.data ?? []).map((mapping) => mapping.quyen_id),
  );

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Sửa vai trò và quyền"
          description="Cập nhật tên, mô tả và tập quyền đã chọn. Mã vai trò là định danh cố định."
          actions={
            <Link className="button-link button-secondary" href="/admin/roles">
              Quay lại vai trò & quyền
            </Link>
          }
        />
        {query.error && errorMessages[query.error] ? (
          <p aria-live="assertive" className="message error" role="alert">
            {errorMessages[query.error]}
          </p>
        ) : null}

        <FormDraftPersistence persistKey={"role-edit-" + roleResult.data.id} scopeKey={accountId} hasError={Boolean(query.error)} />
        <GuardedForm action={updateRole} className="stack" data-persist-key={"role-edit-" + roleResult.data.id}>
          <input name="role_id" type="hidden" value={roleResult.data.id} />
          <fieldset className="form-section">
            <legend>Thông tin vai trò</legend>
            <div className="form-grid">
              <label>
                Mã vai trò
                <input readOnly value={roleResult.data.ma_vai_tro} />
              </label>
              <label>
                Tên vai trò <span aria-hidden="true" className="required-indicator">*</span>
                <input
                  autoComplete="off"
                  defaultValue={roleResult.data.ten_vai_tro}
                  name="ten_vai_tro"
                  required
                />
              </label>
              <label className="field-full">
                Mô tả
                <textarea defaultValue={roleResult.data.mo_ta ?? ""} name="mo_ta" />
              </label>
            </div>
            <p className="field-help">
              Giữ nguyên mã giúp các mapping tài khoản và quy tắc ứng dụng không bị
              thay đổi ngoài ý muốn. Không thể xóa vai trò hệ thống.
            </p>
          </fieldset>

          <fieldset className="form-section">
            <legend>Quyền được gán</legend>
            <p className="field-help">
              Lưu thay đổi sẽ thay thế tập quyền hiện tại trong cùng một transaction.
              Các permission chỉ có tác dụng ở policy/RPC kiểm tra permission tương ứng.
            </p>
            {(permissionsResult.data ?? []).length === 0 ? (
              <p className="secondary-text">Danh mục chưa có quyền để gán.</p>
            ) : (
              <div className="stack">
                {(permissionsResult.data ?? []).map((permission) => (
                  <label key={permission.id}>
                    <input
                      defaultChecked={selectedPermissionIds.has(permission.id)}
                      name="permission_ids"
                      type="checkbox"
                      value={permission.id}
                    />
                    <strong>{permission.ma_quyen}</strong> — {permission.ten_quyen}
                    {permission.mo_ta ? (
                      <span className="secondary-text"> — {permission.mo_ta}</span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="form-actions">
            <PendingSubmitButton pendingLabel="Đang lưu thay đổi…">
              Lưu thay đổi
            </PendingSubmitButton>
            <DraftCancelLink className="button-link button-secondary" href="/admin/roles" scopeKey={accountId} persistKeys={["role-edit-" + roleResult.data.id]}>
              Hủy
            </DraftCancelLink>
          </div>
        </GuardedForm>
      </section>
    </main>
  );
}
