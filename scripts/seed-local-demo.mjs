import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.API_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
const adminEmail = process.env.DEMO_ADMIN_EMAIL;
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
const saEmail = process.env.DEMO_SA_EMAIL;
const saPassword = process.env.DEMO_SA_PASSWORD;

assert.ok(url, "API_URL is required (use the local Supabase API URL from supabase status -o env)");
assert.ok(serviceRoleKey, "SERVICE_ROLE_KEY is required (use the local Supabase service_role key)");
assert.ok(adminEmail && adminPassword, "DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD are required");
assert.ok(saEmail && saPassword, "DEMO_SA_EMAIL and DEMO_SA_PASSWORD are required");
assert.notEqual(adminEmail.toLowerCase(), saEmail.toLowerCase(), "Admin and pending SA emails must differ");

const parsedUrl = new URL(url);
assert.ok(
  ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname),
  "Refusing to seed non-local Supabase. API_URL must resolve to localhost/127.0.0.1/::1.",
);

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const supabase = createClient(url, serviceRoleKey, options);
const ADMIN_ROLE_ID = "10000000-0000-0000-0000-000000000001";

async function findOrCreateAuthUser(email, password, userMetadata = {}) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  assert.equal(listError, null, `Could not list local Auth users: ${listError?.message}`);
  const existing = listed.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, ...userMetadata },
    });
    assert.equal(error, null, `Could not update local demo user: ${error?.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  assert.equal(error, null, `Could not create local demo user: ${error?.message}`);
  assert.ok(data.user, "Auth user creation must return a user");
  return data.user;
}

const admin = await findOrCreateAuthUser(adminEmail, adminPassword);
const { data: adminAccount, error: adminAccountReadError } = await supabase
  .from("tai_khoan")
  .select("id")
  .eq("id", admin.id)
  .maybeSingle();
assert.equal(adminAccountReadError, null, adminAccountReadError?.message);

if (!adminAccount) {
  const { error } = await supabase.from("tai_khoan").insert({
    id: admin.id,
    ho_ten: "Local Demo Admin",
    email: adminEmail.toLowerCase(),
    so_dien_thoai: "0900000001",
    ma_dai_ly: "LOCAL-DEMO-ADMIN",
    manager_id: null,
    trang_thai: "DANG_HOAT_DONG",
  });
  assert.equal(error, null, `Could not create local Admin account: ${error?.message}`);
} else {
  const { error } = await supabase.from("tai_khoan").update({
    ho_ten: "Local Demo Admin",
    email: adminEmail.toLowerCase(),
    trang_thai: "DANG_HOAT_DONG",
  }).eq("id", admin.id);
  assert.equal(error, null, `Could not activate local Admin account: ${error?.message}`);
}

const { error: roleError } = await supabase.from("phan_cong_vai_tro").upsert(
  { tai_khoan_id: admin.id, vai_tro_id: ADMIN_ROLE_ID },
  { onConflict: "tai_khoan_id,vai_tro_id", ignoreDuplicates: true },
);
assert.equal(roleError, null, `Could not assign local Admin role: ${roleError?.message}`);

const pendingSa = await findOrCreateAuthUser(saEmail, saPassword, {
  registration_type: "SA_SELF_REGISTRATION",
  ho_ten: "Local Demo Pending SA",
  so_dien_thoai: "0900000002",
  ma_dai_ly: "LOCAL-DEMO-SA",
});
const { data: pendingAccount, error: pendingReadError } = await supabase
  .from("tai_khoan")
  .select("id,trang_thai")
  .eq("id", pendingSa.id)
  .maybeSingle();
assert.equal(pendingReadError, null, pendingReadError?.message);

if (!pendingAccount) {
  const { error } = await supabase.from("tai_khoan").insert({
    id: pendingSa.id,
    ho_ten: "Local Demo Pending SA",
    email: saEmail.toLowerCase(),
    so_dien_thoai: "0900000002",
    ma_dai_ly: "LOCAL-DEMO-SA",
    manager_id: null,
    trang_thai: "CHO_PHE_DUYET",
  });
  assert.equal(error, null, `Could not create pending SA account: ${error?.message}`);
  const { error: roleAssignError } = await supabase.from("phan_cong_vai_tro").upsert(
    { tai_khoan_id: pendingSa.id, vai_tro_id: "10000000-0000-0000-0000-000000000004" },
    { onConflict: "tai_khoan_id,vai_tro_id", ignoreDuplicates: true },
  );
  assert.equal(roleAssignError, null, `Could not assign local SA role: ${roleAssignError?.message}`);
} else {
  assert.equal(
    pendingAccount.trang_thai,
    "CHO_PHE_DUYET",
    "Existing demo SA must remain pending; refusing to silently change its lifecycle state.",
  );
}

console.log("Local demo fixtures are ready.");
console.log(`Admin login: ${adminEmail}`);
console.log(`Pending SA login: ${saEmail}`);
console.log("Open /admin/accounts with the Admin login and approve the pending SA.");
console.log("Credentials are the values you supplied via environment variables; no passwords are printed.");
