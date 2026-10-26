import { SearchableCheckboxPicker } from "@/components/searchable-checkbox-picker";
import { permissionGroupForCode } from "@/lib/permission-groups.mjs";

type RolePermission = {
  id: string;
  ma_quyen: string;
  ten_quyen: string;
  mo_ta: string | null;
};

type RolePermissionPickerProps = {
  permissions: RolePermission[];
  selectedIds?: string[];
};

/** Shared presentation for the permission catalogue; role-specific loading and
 * selected-permission resolution stay in the create/edit pages. */
export function RolePermissionPicker({
  permissions,
  selectedIds,
}: RolePermissionPickerProps) {
  return (
    <SearchableCheckboxPicker
      name="permission_ids"
      selectedIds={selectedIds}
      options={permissions.map((permission) => ({
        id: permission.id,
        label: permission.ma_quyen + " — " + permission.ten_quyen,
        detail: permission.mo_ta ?? undefined,
        searchText:
          permission.ma_quyen + " " + permission.ten_quyen + " " + (permission.mo_ta ?? ""),
        group: permissionGroupForCode(permission.ma_quyen),
      }))}
      searchLabel="Tìm quyền"
      searchPlaceholder="Mã quyền, tên quyền hoặc mô tả"
      selectedCountLabel="quyền"
      emptyMessage="Danh mục chưa có quyền để gán."
      noResultsMessage="Không tìm thấy quyền phù hợp."
    />
  );
}
