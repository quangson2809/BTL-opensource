import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { buildLiteralSearch, sanitizePostgrestOrSearch } from "../../../src/lib/list-query.mjs";

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const setup = createClient(process.env.API_URL, process.env.SERVICE_ROLE_KEY, options);
const client = createClient(process.env.API_URL, process.env.ANON_KEY, options);
const suffix = `${Date.now()}-${process.pid}`;
const email = `search-${suffix}@example.test`;
const password = "SearchFixture1";
const { data: identity, error: identityError } = await setup.auth.admin.createUser({ email, password, email_confirm: true });
assert.equal(identityError, null);
const accountId = identity.user.id;
const accountCode = `SEARCH_${suffix}`;
assert.equal((await setup.from("tai_khoan").insert({ id: accountId, ho_ten: "Search fixture", email, so_dien_thoai: `S-${suffix}`, ma_dai_ly: accountCode, trang_thai: "DANG_HOAT_DONG" })).error, null);
assert.equal((await setup.from("phan_cong_vai_tro").insert({ tai_khoan_id: accountId, vai_tro_id: "10000000-0000-0000-0000-000000000004" })).error, null);
assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);

for (const term of [email, accountCode]) {
  const result = await client.from("tai_khoan").select("id", { count: "exact" }).or(buildLiteralSearch(["email", "ma_dai_ly"], term));
  assert.equal(result.error, null);
  assert.equal(result.count, 1);
  assert.equal(result.data[0].id, accountId);
}

for (const [index, term] of ['Tên,(mã).%_\\ OR true', 'Dấu "ngoặc" (a|b)', 'Dấu * và [x]+?', 'Hà Nội'].entries()) {
  const { data: customer, error } = await client.from("khach_hang").insert({ chu_so_huu_id: accountId, ho_ten: term, so_dien_thoai: `SL-${suffix}-${index}`, gioi_tinh: "Nam", ngay_sinh: "1990-01-01", dia_chi: "Địa chỉ", so_thich: "Sách", ghi_chu: "Search test", loai_khach_hang: "MUC_TIEU", tinh_trang: "BẠN", nhom_tinh_cach: "D" }).select("id").single();
  assert.equal(error, null);
  const query = await client.from("khach_hang").select("id", { count: "exact" }).or(buildLiteralSearch(["ho_ten"], sanitizePostgrestOrSearch(term)));
  assert.equal(query.error, null, `literal query ${index} must parse`);
  assert.equal(query.count, 1);
  assert.deepEqual(query.data.map((row) => row.id), [customer.id]);
}
const denied = await createClient(process.env.API_URL, process.env.ANON_KEY, options).from("khach_hang").select("id").or(buildLiteralSearch(["ho_ten"], "Hà Nội"));
assert.equal(denied.error?.code, "42501", "anonymous requests remain denied at the table boundary");
assert.equal(denied.data, null);
console.log("Literal search integration: email, codes, punctuation, regex/wildcards, counts and anonymous isolation PASS.");
