import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("system audit log is RLS-protected for Admin and stores no copied row payload", async () => {
  const migration = await read("../supabase/migrations/20261027120000_system_audit_log.sql");
  assert.match(migration, /alter table public\.nhat_ky_he_thong enable row level security/i);
  assert.match(migration, /using \(public\.has_role\('ADMIN'\)\)/i);
  assert.match(migration, /revoke all on public\.nhat_ky_he_thong from anon, authenticated/i);
  assert.match(migration, /insert into public\.nhat_ky_he_thong \(actor_id, action, entity, entity_id\)/i);
  assert.doesNotMatch(migration, /before_data|after_data|to_jsonb\(old\).*insert/i);
  assert.match(migration, /'tai_khoan'/);
  assert.match(migration, /'khach_hang'/);
});

test("Supabase Auth database trigger records identity creation and meaningful updates only", async () => {
  const migration = await read("../supabase/migrations/20261027120000_system_audit_log.sql");
  assert.match(migration, /create trigger trg_audit_auth_users_insert\s+after insert on auth\.users/i);
  assert.match(migration, /create trigger trg_audit_auth_users_update\s+after update on auth\.users/i);
  assert.match(migration, /'AUTH_USER_CREATED'/);
  assert.match(migration, /'AUTH_USER_UPDATED'/);
  assert.match(migration, /old\.email is distinct from new\.email/i);
  assert.match(migration, /old\.raw_user_meta_data is distinct from new\.raw_user_meta_data/i);
  assert.match(migration, /'LOGIN_SUCCESS'.*'LOGIN_FAILURE'.*'LOGOUT'/s);
  assert.doesNotMatch(migration, /insert into public\.nhat_ky_he_thong[^;]*(email|password|token|raw_user_meta_data)/i);
});

test("login/logout actions write metadata-only auth audit events without affecting auth outcome", async () => {
  const actions = await read("../src/app/auth/actions.ts");
  assert.match(actions, /recordAuthAuditEvent\("LOGIN_FAILURE", null\)/);
  assert.match(actions, /recordAuthAuditEvent\("LOGIN_SUCCESS", authenticatedUserId\)/);
  assert.match(actions, /recordAuthAuditEvent\("LOGOUT", data\.user\?\.id \?\? null\)/);
  assert.match(actions, /from\("nhat_ky_he_thong"\)\.insert/);
  assert.doesNotMatch(actions, /actor_id:\s*email|entity_id:\s*email|insert\([\s\S]{0,250}password/i);
});

test("audit-log page uses the shared Admin guard, labels auth events and paginates newest-first", async () => {
  const page = await read("../src/app/admin/audit-logs/page.tsx");
  assert.match(page, /requireAdmin\(\)/);
  assert.match(page, /from\("nhat_ky_he_thong"\)/);
  assert.match(page, /order\("occurred_at", \{ ascending: false \}\)/);
  assert.match(page, /LOGIN_SUCCESS:\s*"Đăng nhập thành công"/);
  assert.match(page, /LOGIN_FAILURE:\s*"Đăng nhập thất bại"/);
  assert.match(page, /LOGOUT:\s*"Đăng xuất"/);
  assert.match(page, /range\(/);
});
