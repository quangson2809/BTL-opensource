import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

assert.ok(url, "API_URL is required");
assert.ok(anonKey, "ANON_KEY is required");
assert.ok(serviceRoleKey, "SERVICE_ROLE_KEY is required");

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const setup = createClient(url, serviceRoleKey, options);
const createUserClient = () => createClient(url, anonKey, options);
const DM_ROLE_ID = "10000000-0000-0000-0000-000000000002";
const SA_ROLE_ID = "10000000-0000-0000-0000-000000000004";
const suffix = String(Date.now()) + "-" + String(process.pid);

function assertNoError(error, context) {
  assert.equal(error, null, context + ": " + (error?.message ?? "unexpected error"));
}

async function fixture(label, roleId, managerId = null, status = "DANG_HOAT_DONG") {
  const email = "p79-" + label + "-" + suffix + "@example.test";
  const password = "Phase79Password1";
  const { data: identity, error: identityError } = await setup.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assertNoError(identityError, "create " + label + " auth fixture");
  assert.ok(identity.user, label + " auth fixture must exist");

  const id = identity.user.id;
  const { error: accountError } = await setup.from("tai_khoan").insert({
    id,
    ho_ten: "Phase 7-9 " + label,
    email,
    so_dien_thoai: "P79-PHONE-" + label + "-" + suffix,
    ma_dai_ly: "P79-" + label.toUpperCase() + "-" + suffix,
    manager_id: managerId,
    trang_thai: status,
  });
  assertNoError(accountError, "create " + label + " account");

  const { error: roleError } = await setup.from("phan_cong_vai_tro").insert({
    tai_khoan_id: id,
    vai_tro_id: roleId,
  });
  assertNoError(roleError, "assign " + label + " role");

  const client = createUserClient();
  const { data: login, error: loginError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  assertNoError(loginError, "login " + label);
  assert.ok(login.session, label + " password session must exist");

  return { id, client };
}

const dm = await fixture("dm", DM_ROLE_ID);
const sa = await fixture("sa", SA_ROLE_ID, dm.id);
const outsider = await fixture("outside", SA_ROLE_ID);
const dm2 = await fixture("dm2", DM_ROLE_ID);

const { error: customerError } = await sa.client.from("khach_hang").insert({
  chu_so_huu_id: sa.id,
  ma_khach_hang: "P79-KH-" + suffix,
  ho_ten: "Khách report integration",
  so_dien_thoai: "P79-KH-PHONE-" + suffix,
  gioi_tinh: "Nam",
  ngay_sinh: "1990-01-01",
  dia_chi: "Hà Nội",
  so_thich: "Đọc sách",
  ghi_chu: "Phase 7 report",
  loai_khach_hang: "MUC_TIEU",
  tinh_trang: "BẠN",
  nhom_tinh_cach: "D",
});
assertNoError(customerError, "SA create report customer");

const activityTime = new Date();
const periodStart = new Date(activityTime.getTime() - 60 * 60 * 1000).toISOString();
const periodEnd = new Date(activityTime.getTime() + 60 * 60 * 1000).toISOString();

const { data: activity, error: activityError } = await sa.client
  .from("hoat_dong")
  .insert({
    tai_khoan_id: sa.id,
    loai_hoat_dong: "TƯ_VẤN",
    dia_diem: "Hà Nội",
    thoi_gian: activityTime.toISOString(),
    so_khach_hang_ket_noi: 5,
  })
  .select("id")
  .single();
assertNoError(activityError, "SA create report activity");
assert.ok(activity?.id, "report activity id must exist");

const { data: report, error: reportError } = await dm.client.rpc("report_scope", {
  period_start: periodStart,
  period_end: periodEnd,
});
assertNoError(reportError, "DM scoped report");
assert.ok(
  report.some((row) => row.account_id === dm.id) &&
    report.some((row) => row.account_id === sa.id),
  "DM report must include self and subordinate",
);
assert.equal(
  report.some((row) => row.account_id === outsider.id),
  false,
  "DM report must exclude unrelated account",
);

const saRow = report.find((row) => row.account_id === sa.id);
assert.equal(saRow.activity_count, 1, "DM aggregate must count subordinate activity");
assert.equal(
  saRow.connected_customer_count,
  5,
  "DM aggregate must count subordinate connected customers",
);

const { data: deletedByManager, error: deleteByManagerError } = await dm.client
  .from("hoat_dong")
  .delete()
  .eq("id", activity.id)
  .select("id");
assertNoError(deleteByManagerError, "manager subordinate delete query");
assert.deepEqual(
  deletedByManager,
  [],
  "manager cannot delete subordinate activity",
);

const { data: draftId, error: draftError } = await dm.client.rpc(
  "dm_create_notification",
  {
    notification_title: "P79 integration draft " + suffix,
    notification_content: "Integration body",
    notification_type: "TIN_TỨC",
    recipient_ids: [sa.id],
  },
);
assertNoError(draftError, "DM create integration draft");
assert.ok(draftId, "notification draft id must exist");

const { error: directInsertError } = await dm.client.from("thong_bao").insert({
  nguoi_tao_id: dm.id,
  tieu_de: "Direct forbidden " + suffix,
  noi_dung: "Forbidden",
  loai: "TIN_TỨC",
  trang_thai: "CHƯA_GỬI",
});
assert.ok(directInsertError, "DM direct notification insert must be denied");

const { error: nonOwnerSendError } = await dm2.client.rpc("dm_send_notification", {
  target_notification_id: draftId,
});
assert.ok(nonOwnerSendError, "different DM cannot send owned draft");

const { error: sendError } = await dm.client.rpc("dm_send_notification", {
  target_notification_id: draftId,
});
assertNoError(sendError, "owner DM send draft");

const { error: resendError } = await dm.client.rpc("dm_send_notification", {
  target_notification_id: draftId,
});
assert.ok(resendError, "sent notification cannot be sent twice");

const { data: staleDraftId, error: staleDraftError } = await dm.client.rpc(
  "dm_create_notification",
  {
    notification_title: "P79 stale " + suffix,
    notification_content: "Recipient will leave subtree",
    notification_type: "TIN_TỨC",
    recipient_ids: [sa.id],
  },
);
assertNoError(staleDraftError, "create stale-recipient draft");

const { error: moveError } = await setup
  .from("tai_khoan")
  .update({ manager_id: null })
  .eq("id", sa.id);
assertNoError(moveError, "move recipient outside DM subtree");

const { error: staleSendError } = await dm.client.rpc("dm_send_notification", {
  target_notification_id: staleDraftId,
});
assert.ok(staleSendError, "send must reject recipient that left subtree");

const { error: lockError } = await setup
  .from("tai_khoan")
  .update({ trang_thai: "KHOA" })
  .eq("id", dm.id);
assertNoError(lockError, "lock DM fixture");

const { error: lockedReportError } = await dm.client.rpc("report_scope", {
  period_start: periodStart,
  period_end: periodEnd,
});
assert.ok(
  lockedReportError,
  "existing locked-account JWT cannot call reporting SECURITY DEFINER RPC",
);

console.log("Phase 7 reporting and hardening integration tests passed.");
