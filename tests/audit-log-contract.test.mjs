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

test("audit-log page uses the shared Admin guard and paginates newest-first", async () => {
  const page = await read("../src/app/admin/audit-logs/page.tsx");
  assert.match(page, /requireAdmin\(\)/);
  assert.match(page, /from\("nhat_ky_he_thong"\)/);
  assert.match(page, /order\("occurred_at", \{ ascending: false \}\)/);
  assert.match(page, /range\(/);
});
