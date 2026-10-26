import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("create and edit role pages share the permission picker without merging their workflows", async () => {
  const [create, edit, picker, actions, adminGuard] = await Promise.all([
    readSource("../src/app/admin/roles/new/page.tsx"),
    readSource("../src/app/admin/roles/[id]/edit/page.tsx"),
    readSource("../src/components/admin/role-permission-picker.tsx"),
    readSource("../src/app/admin/roles/actions.ts"),
    readSource("../src/lib/admin.ts"),
  ]);

  assert.match(create, /requireAdmin\(\)/);
  assert.match(create, /\.from\("quyen"\)/);
  assert.match(create, /<RolePermissionPicker permissions=\{permissions \?\? \[\]\} \/>/);
  assert.match(create, /createRole/);

  assert.match(edit, /requireAdmin\(\)/);
  assert.match(edit, /\.from\("quyen"\)/);
  assert.match(edit, /\.from\("phan_quyen_vai_tro"\)/);
  assert.match(edit, /selectedPermissionIds/);
  assert.match(edit, /selectedIds=\{Array\.from\(selectedPermissionIds\)\}/);
  assert.match(edit, /SYSTEM_ROLE_CODES\.has\(roleResult\.data\.ma_vai_tro\)/);
  assert.match(edit, /updateRole/);

  assert.match(picker, /name="permission_ids"/);
  assert.match(picker, /permissionGroupForCode\(permission\.ma_quyen\)/);
  assert.match(picker, /permission\.ma_quyen \+ " — " \+ permission\.ten_quyen/);
  assert.match(picker, /searchText:/);
  assert.match(picker, /searchPlaceholder="Mã quyền, tên quyền hoặc mô tả"/);
  assert.match(picker, /selectedIds=\{selectedIds\}/);

  assert.match(actions, /await requireAdmin\(\)/);
  assert.match(actions, /admin_create_role/);
  assert.match(actions, /admin_update_role/);
  assert.match(actions, /SYSTEM_ROLE_CODES\.has\(roleCode\)/);
  assert.match(actions, /permissionIds\(formData\)/);
  assert.match(adminGuard, /requireAdmin/);
});

test("role permission picker preserves picker filtering, selection, and draft restoration behavior", async () => {
  const picker = await readSource("../src/components/searchable-checkbox-picker.tsx");
  assert.match(picker, /setQuery\(event\.target\.value\)/);
  assert.match(picker, /checked=\{selectedSet\.has\(option\.id\)\}/);
  assert.match(picker, /hidden=\{!visible\}/);
  assert.match(picker, /Bỏ chọn/);
  assert.match(picker, /idaily:form-draft-restored/);
});
