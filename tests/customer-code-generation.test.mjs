import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("customer creation no longer asks the user to supply a code", () => {
  const form = read("../src/app/customers/new/page.tsx");
  assert.doesNotMatch(form, /name=["']ma_khach_hang["']/);
  assert.match(form, /mã khách hàng được sinh tự động/i);
});

test("Server Action does not trust client code and retries only code conflicts", () => {
  const actions = read("../src/app/customers/actions.ts");
  const payload = actions.match(/function customerPayload\(formData: FormData\) \{[\s\S]*?return payload;\n\}/)?.[0];
  assert.ok(payload, "customer payload validator exists");
  assert.doesNotMatch(payload, /ma_khach_hang/);
  assert.match(actions, /\.select\("id,ma_khach_hang"\)/);
  assert.match(actions, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
  assert.match(actions, /includes\("khach_hang_ma_khach_hang_key"\)/);
});

test("customer codes are generated and made immutable in PostgreSQL", () => {
  const migration = read("../supabase/migrations/20261024135136_customer_code_generation.sql");
  const schema = read("../supabase/migrations/20261009071632_core_schema.sql");
  const schemaTest = read("../supabase/tests/database/001_schema_test.sql");

  assert.match(migration, /create sequence if not exists app_private\.khach_hang_code_seq/);
  assert.match(migration, /pg_catalog\.nextval/);
  assert.match(migration, /pg_catalog\.lpad\(v_next_value::text, 6, '0'\)/);
  assert.match(migration, /before insert or update on public\.khach_hang/);
  assert.match(migration, /new\.ma_khach_hang := old\.ma_khach_hang/);
  assert.match(migration, /revoke all on function app_private\.assign_khach_hang_code\(\) from public, anon, authenticated/);
  assert.match(schema, /constraint khach_hang_ma_khach_hang_key unique \(ma_khach_hang\)/);
  assert.match(schemaTest, /col_is_unique\('public', 'khach_hang', 'ma_khach_hang'/);
  assert.match(schemaTest, /customer code sequence exists/);
});

test("authenticated database integration exercises tampering and concurrent inserts", () => {
  const integration = read("../supabase/tests/auth/004_phase4_6_mvp.mjs");
  const rlsTest = read("../supabase/tests/database/002_rls_test.sql");

  assert.match(integration, /CLIENT-FORGED-CODE-/);
  assert.match(integration, /assert\.notEqual\(customer\.ma_khach_hang, submittedCustomerCode/);
  assert.match(integration, /const concurrentCustomers = await Promise\.all/);
  assert.match(integration, /new Set\(generatedCodes\)\.size, 3/);
  assert.match(rlsTest, /customer code is immutable even when a client attempts to change it/);
});

test("edit form keeps the code read-only while detail and list still use it", () => {
  const editForm = read("../src/app/customers/[id]/edit/page.tsx");
  const detail = read("../src/app/customers/[id]/page.tsx");
  const list = read("../src/app/customers/page.tsx");

  assert.doesNotMatch(editForm, /name=["']ma_khach_hang["']/);
  assert.match(editForm, /customer\.ma_khach_hang/);
  assert.match(detail, /customer\.ma_khach_hang/);
  assert.match(list, /ma_khach_hang\.ilike/);
});
