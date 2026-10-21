
import { DraftCancelLink } from "@/components/draft-cancel-link";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { GuardedForm } from "@/components/guarded-form";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SearchableCheckboxPicker } from "@/components/searchable-checkbox-picker";
import { permissionGroupForCode } from "@/lib/permission-groups.mjs";

import { createRole } from "@/app/admin/roles/actions";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type NewRolePageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Mã vai trò, tên vai trò hoặc danh sách quyền không hợp lệ.",
  duplicate: "Mã hoặc tên vai trò đã tồn tại.",
  save: "Không thể tạo vai trò. Hãy kiểm tra dữ liệu rồi thử lại.",
};

export default async function NewRolePage({ searchParams }: NewRolePageProps) {
  const query = await searchParams;
  const { supabase, accountId } = await requireAdmin();
  const { data: permissions, error } = await supabase
    .from("quyen")
    .select("id,ma_quyen,ten_quyen,mo_ta")
    .order("ma_quyen");

  if (error) {
    throw new Error("Không thể tải danh mục quyền hiện có.");
  }

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Tạo vai trò"
          description="Tạo mã vai trò mới và chọn các quyền đã được định nghĩa trong danh mục."
          actions={
            <DraftCancelLink className="button-link button-secondary" href="/admin/roles" scopeKey={accountId} persistKeys={["role-create"]}>
              Quay lại vai trò & quyền
            </DraftCancelLink>
          }
        />
        {query.error && errorMessages[query.error] ? (
          <p aria-live="assertive" className="message error" role="alert">
            {errorMessages[query.error]}
          </p>
        ) : null}

        <p className="form-required-note">
          <span aria-hidden="true">*</span> Trường bắt buộc
        </p>
        <FormDraftPersistence persistKey="role-create" scopeKey={accountId} hasError={Boolean(query.error)} />
        <GuardedForm action={createRole} className="stack" data-persist-key="role-create">
          <fieldset className="form-section">
            <legend>Thông tin vai trò</legend>
            <div className="form-grid">
              <label>
                Mã vai trò <span aria-hidden="true" className="required-indicator">*</span>
                <input
                  autoCapitalize="characters"
                  autoComplete="off"
                  name="ma_vai_tro"
                  pattern="[A-Za-z][A-Za-z0-9_]*"
                  placeholder="VD_BAO_CAO"
                  required
                />
              </label>
              <label>
                Tên vai trò <span aria-hidden="true" className="required-indicator">*</span>
                <input autoComplete="off" name="ten_vai_tro" required />
              </label>
              <label className="field-full">
                Mô tả
                <textarea name="mo_ta" />
              </label>
            </div>
            <p className="field-help">
              Mã vai trò sẽ được chuẩn hóa thành chữ hoa và giữ cố định sau khi tạo.
              Các mã ADMIN, DM, UM và SA dành riêng cho vai trò hệ thống.
            </p>
          </fieldset>

          <fieldset className="form-section">
            <legend>Quyền được gán</legend>
            <p className="field-help">
              Chọn trong danh mục hiện có. Việc gán quyền chỉ ảnh hưởng ở các policy/RPC
              có kiểm tra permission tương ứng; không tự tạo quyền truy cập màn hình mới.
            </p>
            <SearchableCheckboxPicker
              name="permission_ids"
              options={(permissions ?? []).map((permission) => ({
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
            <PendingSubmitButton pendingLabel="Đang tạo vai trò…">
              Tạo vai trò
            </PendingSubmitButton>
            <DraftCancelLink className="button-link button-secondary" href="/admin/roles" scopeKey={accountId} persistKeys={["role-create"]}>
              Hủy
            </DraftCancelLink>
          </div>
        </GuardedForm>
      </section>
    </main>
  );
}
