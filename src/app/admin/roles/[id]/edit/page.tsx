import { notFound } from "next/navigation";

import { DraftCancelLink } from "@/components/draft-cancel-link";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { GuardedForm } from "@/components/guarded-form";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SearchableCheckboxPicker } from "@/components/searchable-checkbox-picker";
import { permissionGroupForCode } from "@/lib/permission-groups.mjs";

import { updateRole } from "@/app/admin/roles/actions";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/input-validation.mjs";

export const dynamic = "force-dynamic";

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
  if (!roleResult.data) {
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
          description="Cập nhật tập quyền của vai trò bất cứ lúc nào. Mã vai trò luôn cố định."
          actions={
            <DraftCancelLink className="button-link button-secondary" href="/admin/roles" scopeKey={accountId} persistKeys={["role-edit-" + roleResult.data.id]}>
              Quay lại vai trò & quyền
            </DraftCancelLink>
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
                Tên vai trò
                <input readOnly value={roleResult.data.ten_vai_tro} />
                <input name="ten_vai_tro" type="hidden" value={roleResult.data.ten_vai_tro} />
              </label>
              <label className="field-full">
                Mô tả
                <textarea readOnly value={roleResult.data.mo_ta ?? ""} />
                <input name="mo_ta" type="hidden" value={roleResult.data.mo_ta ?? ""} />
              </label>
            </div>
            <p className="field-help">
              Mã, tên và mô tả vai trò không được thay đổi tại màn hình này. Bạn có thể cập nhật tập quyền bên dưới, kể cả với vai trò hệ thống.
            </p>
          </fieldset>

          <fieldset className="form-section">
            <legend>Quyền được gán</legend>
            <p className="field-help">
              Lưu thay đổi sẽ thay thế tập quyền hiện tại trong cùng một transaction. Áp dụng cho mọi vai trò, bao gồm ADMIN, DM, UM và SA.
              Các permission chỉ có tác dụng ở policy/RPC kiểm tra permission tương ứng.
            </p>
            <SearchableCheckboxPicker
              name="permission_ids"
              selectedIds={Array.from(selectedPermissionIds)}
              options={(permissionsResult.data ?? []).map((permission) => ({
                id: permission.id,
                label: permission.ma_quyen + " — " + permission.ten_quyen,
                detail: permission.mo_ta ?? undefined,
                searchText: permission.ma_quyen + " " + permission.ten_quyen + " " + (permission.mo_ta ?? ""),
                group: permissionGroupForCode(permission.ma_quyen),
              }))}
              searchLabel="Tìm quyền"
              searchPlaceholder="Mã quyền, tên quyền hoặc mô tả"
              selectedCountLabel="quyền"
              emptyMessage="Danh mục chưa có quyền để gán."
              noResultsMessage="Không tìm thấy quyền phù hợp."
            />
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
