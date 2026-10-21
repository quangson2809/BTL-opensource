import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { permissionGroupForCode } from "../src/lib/permission-groups.mjs";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("permission grouping is presentation-only and leaves unknown keys in a neutral group", () => {
  assert.equal(permissionGroupForCode("ACTIVITY_VIEW_SUBTREE"), "Hoạt động");
  assert.equal(permissionGroupForCode("REPORT_READ"), "Báo cáo");
  assert.equal(permissionGroupForCode("custom_unknown_key"), "Quyền khác");
  assert.equal(permissionGroupForCode(""), "Quyền khác");
});

test("recipient and permission pickers keep checkbox values while filtering", async () => {
  const source = await readSource("../src/components/searchable-checkbox-picker.tsx");
  assert.match(source, /checkedIdsInForm/);
  assert.match(source, /name=\{name\}/);
  assert.match(source, /hidden=\{!visible\}/);
  assert.match(source, /setQuery\(event\.target\.value\)/);
  assert.match(source, /Đã chọn \{selectedIds\.length\}/);
  assert.match(source, /Bỏ chọn/);
  assert.match(source, /noResultsMessage/);
  assert.match(source, /idaily:form-draft-restored/);
  assert.match(source, /validateRequiredSelection/);
});

test("notification create and edit use the same recipient picker and preserve draft key isolation", async () => {
  const create = await readSource("../src/app/notifications/new/page.tsx");
  const edit = await readSource("../src/app/notifications/[id]/edit/page.tsx");
  const action = await readSource("../src/app/notifications/actions.ts");

  assert.match(create, /SearchableCheckboxPicker/);
  assert.match(edit, /SearchableCheckboxPicker/);
  assert.match(create, /notification-draft/);
  assert.match(edit, /notification-edit-/);
  assert.match(edit, /notification\.trang_thai !== "CHƯA_GỬI"/);
  assert.match(action, /dm_create_notification/);
  assert.match(action, /dm_update_notification_draft/);
  assert.match(action, /dm_delete_notification_draft/);
  assert.match(action, /dm_send_notification/);
});

test("sent notifications remain read-only in the listing and only owned drafts expose edit/delete/send", async () => {
  const source = await readSource("../src/app/notifications/page.tsx");
  assert.match(source, /const isDraft = notification\.trang_thai === "CHƯA_GỬI"/);
  assert.match(source, /owned && isDraft/);
  assert.match(source, /Sửa bản nháp/);
  assert.match(source, /Xóa bản nháp/);
  assert.match(source, /Gửi thông báo/);
});

test("role forms use searchable grouped permission selection without changing permission IDs", async () => {
  const create = await readSource("../src/app/admin/roles/new/page.tsx");
  const edit = await readSource("../src/app/admin/roles/[id]/edit/page.tsx");
  const helper = await readSource("../src/lib/permission-groups.mjs");
  const actions = await readSource("../src/app/admin/roles/actions.ts");

  assert.match(create, /SearchableCheckboxPicker/);
  assert.match(edit, /SearchableCheckboxPicker/);
  assert.match(create, /permissionGroupForCode/);
  assert.match(edit, /permissionGroupForCode/);
  assert.match(edit, /selectedPermissionIds/);
  assert.match(helper, /ACTIVITY: "Hoạt động"/);
  assert.match(actions, /admin_create_role/);
  assert.match(actions, /admin_update_role/);
});

test("account actions identify the exact account and role before confirmation", async () => {
  const source = await readSource("../src/app/admin/accounts/[id]/page.tsx");
  assert.match(source, /confirmMessage=\{"Phê duyệt tài khoản " \+ account\.ho_ten/);
  assert.match(source, /confirmMessage=\{"Bạn có chắc muốn khóa tài khoản " \+ account\.ho_ten/);
  assert.match(source, /confirmMessage=\{"Mở khóa tài khoản " \+ account\.ho_ten/);
  assert.match(source, /role\.ten_vai_tro/);
});

test("draft persistence notifies client pickers after restoring checkbox selections", async () => {
  const persistence = await readSource("../src/components/form-draft-persistence.tsx");
  const picker = await readSource("../src/components/searchable-checkbox-picker.tsx");
  assert.match(persistence, /idaily:form-draft-restored/);
  assert.match(picker, /form\.addEventListener\("idaily:form-draft-restored"/);
});

test("pending submit supports a safe disabled state for inaccessible recipient selections", async () => {
  const source = await readSource("../src/components/pending-submit-button.tsx");
  assert.match(source, /disabled\?: boolean/);
  assert.match(source, /presentation\.disabled \|\| disabled/);
});
