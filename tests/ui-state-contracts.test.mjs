import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("root boundaries provide loading, safe retry, localized not-found, and fatal fallback", async () => {
  const [loading, error, globalError, notFound] = await Promise.all([
    readSource("../src/app/loading.tsx"),
    readSource("../src/app/error.tsx"),
    readSource("../src/app/global-error.tsx"),
    readSource("../src/app/not-found.tsx"),
  ]);

  assert.ok(loading.includes("LoadingState"));
  assert.ok(error.includes("onRetry={reset}"));
  assert.ok(!error.includes("Dữ liệu kỹ thuật được giữ lại trong log"));
  assert.ok(globalError.includes('<html lang="vi">') && globalError.includes("<body>"));
  assert.ok(globalError.includes("onRetry={reset}"));
  assert.ok(notFound.includes("Không tìm thấy trang hoặc bản ghi"));
  assert.ok(notFound.includes('actionHref="/"'));
});

test("shared state components expose screen-reader semantics and safe read recovery", async () => {
  const [loading, error, empty, feedback] = await Promise.all([
    readSource("../src/components/loading-state.tsx"),
    readSource("../src/components/error-state.tsx"),
    readSource("../src/components/empty-state.tsx"),
    readSource("../src/components/action-feedback.tsx"),
  ]);

  assert.ok(loading.includes('aria-busy="true"') && loading.includes('role="status"'));
  assert.ok(error.includes('role="alert"') && error.includes("router.refresh()"));
  assert.ok(empty.includes('role="status"') && empty.includes("actionHref && actionLabel"));
  assert.ok(feedback.includes("resolveActionFeedback"));
  assert.ok(feedback.includes('"alert" : "status"'));
});

test("application shell catches account-context failures and fails closed on role-query errors", async () => {
  const source = await readSource("../src/components/app-frame.tsx");

  assert.ok(source.includes("try {") && source.includes("supabase.auth.getUser()"));
  assert.ok(source.includes("catch {") && source.includes("setAccountContextError(true)"));
  assert.ok(source.includes("finally {") && source.includes("setAccountLoaded(true)"));
  assert.ok(source.includes("adminResult.error") && source.includes("dmResult.error"));
  assert.ok(source.includes("umResult.error") && source.includes("saResult.error"));
  assert.ok(source.includes("setRoles(new Set())"));
  assert.ok(source.includes("accountLoadAttempt") && source.includes("setAccountLoadAttempt"));
  assert.ok(source.includes("cancelled = true"));
  assert.ok(source.includes("Không thể tải thông tin tài khoản hoặc quyền truy cập."));
});

test("successful empty lists distinguish no-results and have query-error guards", async () => {
  const cases = [
    ["../src/app/customers/page.tsx", "if (countError)", 'title={!hasFilters ? "Chưa có khách hàng" : "Không tìm thấy kết quả"}'],
    ["../src/app/activities/page.tsx", "if (countError)", 'title={!hasFilters ? "Chưa có hoạt động" : "Không tìm thấy kết quả"}'],
    ["../src/app/notifications/page.tsx", "if (dmResult.error || countResult.error)", 'title={hasFilters ? "Không tìm thấy kết quả"'],
    ["../src/app/admin/accounts/page.tsx", "if (countError)", 'title={hasFilters ? "Không tìm thấy kết quả"'],
  ];

  for (const [path, errorGuard, noResultsLabel] of cases) {
    const source = await readSource(path);
    const errorPosition = source.indexOf(errorGuard);
    const emptyPosition = source.indexOf(noResultsLabel);
    assert.ok(errorPosition >= 0, path + " must handle query errors");
    assert.ok(emptyPosition > errorPosition, path + " must check errors before rendering empty/no-results");
    assert.ok(source.includes("EmptyState"), path + " must use the shared empty state");
  }
});

test("dashboard, personnel, reports, and role catalogue show meaningful empty states", async () => {
  const [dashboard, personnel, reports, roles] = await Promise.all([
    readSource("../src/app/dashboard/page.tsx"),
    readSource("../src/app/personnel/page.tsx"),
    readSource("../src/app/reports/page.tsx"),
    readSource("../src/app/admin/roles/page.tsx"),
  ]);

  assert.ok(dashboard.includes('EmptyState title="Chưa có hoạt động"'));
  assert.ok(personnel.includes("visibleRows.length === 0") && personnel.includes("Chưa có nhân sự trong phạm vi"));
  assert.ok(reports.includes("leaderboard.length > 0") && reports.includes("Chưa có dữ liệu xếp hạng"));
  assert.ok(roles.includes("(roleResult.data ?? []).length === 0") && roles.includes("Chưa có vai trò"));
});

test("Phase 1 duplicate-submit protection and sensitive draft exclusions remain in place", async () => {
  const [guard, persistence] = await Promise.all([
    readSource("../src/components/guarded-form.tsx"),
    readSource("../src/components/form-draft-persistence.tsx"),
  ]);

  assert.ok(guard.includes("if (submitting.current)"));
  assert.ok(guard.includes("submitting.current = true"));
  assert.ok(persistence.includes("SENSITIVE_NAME"));
  assert.ok(persistence.includes("SENSITIVE_TYPE"));
  assert.ok(persistence.includes("sessionStorage.setItem"));
});
