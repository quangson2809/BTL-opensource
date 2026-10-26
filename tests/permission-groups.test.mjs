import assert from "node:assert/strict";
import { test } from "node:test";

import { permissionGroupForCode } from "../src/lib/permission-groups.mjs";

test("permission codes map to the expected admin catalog groups", () => {
  const cases = [
    ["ACTIVITY_VIEW_SUBTREE", "Hoạt động"],
    ["ACCOUNT_READ", "Tài khoản"],
    ["CUSTOMER_READ", "Khách hàng"],
    ["NOTIFICATION_READ", "Thông báo"],
    ["ORDER_READ", "Đơn hàng"],
    ["PERSONNEL_READ", "Nhân sự"],
    ["REPORT_READ", "Báo cáo"],
    ["ROLE_MANAGE", "Vai trò & quyền"],
    ["VOUCHER_READ", "Khuyến mãi"],
  ];

  for (const [code, expected] of cases) {
    assert.equal(permissionGroupForCode(code), expected, code);
  }
});

test("permission grouping normalizes case and surrounding whitespace", () => {
  assert.equal(permissionGroupForCode("  activity_view_subtree "), "Hoạt động");
  assert.equal(permissionGroupForCode(" notification_read "), "Thông báo");
});

test("unknown and malformed permission codes use the fallback group", () => {
  assert.equal(permissionGroupForCode("UNREGISTERED_PERMISSION"), "Quyền khác");
  assert.equal(permissionGroupForCode(""), "Quyền khác");
  assert.equal(permissionGroupForCode(null), "Quyền khác");
  assert.equal(permissionGroupForCode(42), "Quyền khác");
});
