import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

assert.ok(url, "API_URL is required");
assert.ok(anonKey, "ANON_KEY is required");
assert.ok(serviceRoleKey, "SERVICE_ROLE_KEY is required");

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const setup = createClient(url, serviceRoleKey, clientOptions);
const createAnonClient = () => createClient(url, anonKey, clientOptions);

const DM_ROLE_ID = "10000000-0000-0000-0000-000000000002";
const SA_ROLE_ID = "10000000-0000-0000-0000-000000000004";
const suffix = String(Date.now()) + "-" + String(process.pid);

function assertNoError(error, context) {
  assert.equal(error, null, context + ": " + (error?.message ?? "unexpected error"));
}

async function createFixture(label, roleId, managerId = null) {
  const email = "phase46-" + label + "-" + suffix + "@example.test";
  const password = "Phase46Password1";
  const { data: identity, error: identityError } = await setup.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assertNoError(identityError, "create " + label + " Auth fixture");
  assert.ok(identity.user, label + " Auth fixture must exist");

  const id = identity.user.id;
  const digits = String(
    Math.abs(id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0)),
  )
    .padStart(8, "0")
    .slice(-8);
  const { error: accountError } = await setup.from("tai_khoan").insert({
    id,
    ho_ten: "Phase 4-6 " + label,
    email,
    so_dien_thoai: "06" + digits,
    ma_dai_ly: "P46-" + label.toUpperCase() + "-" + suffix,
    manager_id: managerId,
    trang_thai: "DANG_HOAT_DONG",
  });
  assertNoError(accountError, "create " + label + " business fixture");

  const { error: roleError } = await setup.from("phan_cong_vai_tro").insert({
    tai_khoan_id: id,
    vai_tro_id: roleId,
  });
  assertNoError(roleError, "assign " + label + " role");

  const client = createAnonClient();
  const { data: login, error: loginError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  assertNoError(loginError, "login " + label);
  assert.ok(login.session, label + " login must create session");

  return { id, client };
}

const dm = await createFixture("dm", DM_ROLE_ID);
const sa = await createFixture("sa", SA_ROLE_ID, dm.id);
const outsider = await createFixture("outsider", SA_ROLE_ID);

const customerCode = "P46-KH-" + suffix;
const customerPhone = "05" + String(Date.now()).slice(-8);
const { data: customer, error: customerError } = await sa.client
  .from("khach_hang")
  .insert({
    chu_so_huu_id: sa.id,
    ma_khach_hang: customerCode,
    ho_ten: "Khách Phase 4",
    so_dien_thoai: customerPhone,
    gioi_tinh: "Nam",
    ngay_sinh: "1990-01-01",
    dia_chi: "Hà Nội",
    so_thich: "Đọc sách",
    ghi_chu: "MVP integration",
    loai_khach_hang: "MUC_TIEU",
    tinh_trang: "BẠN",
    nhom_tinh_cach: "D",
  })
  .select("id")
  .single();
assertNoError(customerError, "SA create owned customer");
assert.ok(customer?.id, "created customer must have id");

const { data: dmCustomers, error: dmCustomersError } = await dm.client
  .from("khach_hang")
  .select("id")
  .eq("id", customer.id);
assertNoError(dmCustomersError, "DM subordinate customer read query");
assert.deepEqual(dmCustomers, [], "DM must not receive subordinate customer rows");

const { data: activity, error: activityError } = await sa.client
  .from("hoat_dong")
  .insert({
    tai_khoan_id: sa.id,
    loai_hoat_dong: "TƯ_VẤN",
    dia_diem: "Hà Nội",
    thoi_gian: new Date().toISOString(),
    so_khach_hang_ket_noi: 2,
  })
  .select("id")
  .single();
assertNoError(activityError, "SA create own activity");
assert.ok(activity?.id, "created activity must have id");

const { data: dmActivities, error: dmActivitiesError } = await dm.client
  .from("hoat_dong")
  .select("id,tai_khoan_id")
  .eq("id", activity.id);
assertNoError(dmActivitiesError, "DM read subordinate activity");
assert.equal(dmActivities.length, 1, "DM must read subordinate activity");

const { data: summary, error: summaryError } = await dm.client.rpc(
  "personnel_summary",
  { target_account_id: sa.id },
);
assertNoError(summaryError, "DM personnel summary");
assert.equal(summary[0].customer_count, 1, "summary must include customer count");
assert.equal(summary[0].activity_count, 1, "summary must include activity count");
assert.equal(
  summary[0].connected_customer_count,
  2,
  "summary must include connected-customer total",
);

const { error: outsiderSummaryError } = await outsider.client.rpc(
  "personnel_summary",
  { target_account_id: sa.id },
);
assert.ok(outsiderSummaryError, "out-of-scope SA cannot request personnel summary");

const title = "Phase 6 integration " + suffix;
const { data: notificationId, error: notificationCreateError } =
  await dm.client.rpc("dm_create_notification", {
    notification_title: title,
    notification_content: "Notification integration content",
    notification_type: "TIN_TỨC",
    recipient_ids: [sa.id],
  });
assertNoError(notificationCreateError, "DM create draft notification");
assert.ok(notificationId, "draft notification id must be returned");

const { data: draftVisible, error: draftVisibleError } = await sa.client
  .from("thong_bao")
  .select("id")
  .eq("id", notificationId);
assertNoError(draftVisibleError, "recipient draft visibility query");
assert.deepEqual(draftVisible, [], "recipient must not see draft notification");

const { error: outsiderRecipientError } = await dm.client.rpc(
  "dm_create_notification",
  {
    notification_title: "Forbidden " + suffix,
    notification_content: "Outside scope",
    notification_type: "TIN_TỨC",
    recipient_ids: [outsider.id],
  },
);
assert.ok(outsiderRecipientError, "DM cannot select recipient outside subtree");

const { error: nonDmCreateError } = await sa.client.rpc(
  "dm_create_notification",
  {
    notification_title: "Forbidden SA " + suffix,
    notification_content: "No DM role",
    notification_type: "TIN_TỨC",
    recipient_ids: [sa.id],
  },
);
assert.ok(nonDmCreateError, "SA cannot create DM notification");

const { error: sendError } = await dm.client.rpc("dm_send_notification", {
  target_notification_id: notificationId,
});
assertNoError(sendError, "DM send notification");

const { data: sentVisible, error: sentVisibleError } = await sa.client
  .from("thong_bao")
  .select("id,tieu_de,trang_thai")
  .eq("id", notificationId)
  .single();
assertNoError(sentVisibleError, "recipient read sent notification");
assert.equal(sentVisible.trang_thai, "ĐÃ_GỬI", "sent notification state must be visible");

const { data: recipientRows, error: recipientRowsError } = await sa.client
  .from("thong_bao_nguoi_nhan")
  .update({ da_doc: true })
  .eq("thong_bao_id", notificationId)
  .select("id,da_doc");
assertNoError(recipientRowsError, "recipient mark notification read");
assert.equal(recipientRows.length, 1, "recipient must update exactly own recipient row");
assert.equal(recipientRows[0].da_doc, true, "recipient read-state must be true");

const { data: outsiderNotifications, error: outsiderNotificationsError } =
  await outsider.client
    .from("thong_bao")
    .select("id")
    .eq("id", notificationId);
assertNoError(outsiderNotificationsError, "outsider notification query");
assert.deepEqual(
  outsiderNotifications,
  [],
  "non-recipient cannot read sent notification",
);

console.log("Phase 4-6 MVP integration tests passed.");
