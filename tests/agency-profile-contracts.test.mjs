import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { validateAgencyProfileName } from "../src/lib/agency-profile-validation.mjs";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("server validation requires a non-empty single-line display name", () => {
  assert.deepEqual(validateAgencyProfileName(null), { ok: false, code: "missing" });
  assert.deepEqual(validateAgencyProfileName("   "), { ok: false, code: "missing" });
  assert.deepEqual(validateAgencyProfileName("Tên có dấu"), { ok: true, value: "Tên có dấu" });
  assert.deepEqual(validateAgencyProfileName("  Tên mới  "), { ok: true, value: "Tên mới" });
  assert.deepEqual(validateAgencyProfileName("Tên\nkhông hợp lệ"), { ok: false, code: "invalid" });
});

test("profile mutation derives its target only from the authenticated session", async () => {
  const [action, page] = await Promise.all([
    readSource("../src/app/profile/actions.ts"),
    readSource("../src/app/profile/page.tsx"),
  ]);

  assert.ok(action.includes("requireActiveBusinessAccount()"));
  assert.ok(action.includes('.update({ ho_ten: validation.value })'));
  assert.ok(action.includes('.eq("id", accountId)'));
  assert.ok(action.includes('formData.get("ho_ten")'));
  assert.ok(!action.includes('formData.get("id")'));
  assert.ok(!action.includes('formData.get("tai_khoan_id")'));
  assert.ok(page.includes('name="ho_ten"'));
  assert.ok(!page.includes('name="email"'));
  assert.ok(!page.includes('name="so_dien_thoai"'));
  assert.ok(!page.includes('name="trang_thai"'));
  assert.ok(!page.includes('name="manager_id"'));
});

test("profile route uses error/success feedback and exposes a read-only system section", async () => {
  const page = await readSource("../src/app/profile/page.tsx");
  const frame = await readSource("../src/components/app-frame.tsx");
  const migration = await readSource("../supabase/migrations/20261024090000_agency_profile_self_update.sql");

  assert.ok(page.includes('role="status"'));
  assert.ok(page.includes('role="alert"'));
  assert.ok(page.includes("Thông tin do hệ thống quản lý"));
  assert.ok(page.includes("StatusBadge"));
  assert.ok(frame.includes('href="/profile"'));
  assert.match(migration, /grant update\s*\(ho_ten\)/);
  assert.ok(migration.includes("tai_khoan_update_own_profile"));
  assert.ok(migration.includes("app_private.current_account_has_application_access()"));
});


test("profile is included in post-fix responsive screenshot acceptance", async () => {
  const [page, styles, screenshots] = await Promise.all([
    readSource("../src/app/profile/page.tsx"),
    readSource("../src/app/workspace.css"),
    readSource("../tests/phase6-visual-screenshots.cjs"),
  ]);

  assert.ok(page.includes('DM: "Trưởng phòng kinh doanh"'));
  assert.ok(page.includes('UM: "Trưởng nhóm kinh doanh"'));
  assert.ok(styles.includes("var(--color-border)"));
  assert.ok(styles.includes("var(--color-ink-soft)"));
  assert.ok(styles.includes("@media (max-width: 72rem) {\n  .agency-profile-grid"));
  assert.ok(screenshots.includes('{ name: "agency-profile", path: "/profile", expectedHeading: "Hồ sơ đại lý" }'));
  assert.ok(screenshots.includes("...(captureOnly ? [] :"));
});
