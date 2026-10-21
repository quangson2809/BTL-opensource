import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { shouldRedirectUnauthenticated } from "../src/lib/supabase/proxy-route-policy.mjs";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("unauthenticated requests to protected application routes are redirected", () => {
  const protectedRoutes = [
    "/dashboard",
    "/customers",
    "/customers/new",
    "/activities",
    "/activities/new",
    "/notifications",
    "/notifications/new",
    "/notifications/c5000000-0000-4000-8000-000000000001/edit",
    "/reports",
    "/personnel",
    "/admin/accounts",
    "/admin/accounts/c0000000-0000-4000-8000-000000000001",
    "/admin/roles",
    "/admin/roles/new",
    "/admin/roles/c6000000-0000-4000-8000-000000000001/edit",
    "/password/change",
  ];

  for (const pathname of protectedRoutes) {
    assert.equal(
      shouldRedirectUnauthenticated(pathname),
      true,
      pathname + " should be guarded before the page streams a response",
    );
  }
});

test("public authentication routes and the report export 401 contract are not redirected", () => {
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/password/recovery",
    "/password/recovery/verify",
    "/auth/callback",
    "/access-denied",
    "/reports/export",
    "/favicon.ico",
    "/missing-route",
  ];

  for (const pathname of publicRoutes) {
    assert.equal(
      shouldRedirectUnauthenticated(pathname),
      false,
      pathname + " must not be redirected by the protected-page policy",
    );
  }
});

test("protected route matching respects path-segment boundaries", () => {
  assert.equal(shouldRedirectUnauthenticated("/dashboard/overview"), true);
  assert.equal(shouldRedirectUnauthenticated("/customers/c123/edit"), true);
  assert.equal(shouldRedirectUnauthenticated("/reports/export/extra"), true);
  assert.equal(shouldRedirectUnauthenticated("/dashboard-old"), false);
  assert.equal(shouldRedirectUnauthenticated("/admin-tools"), false);
});

test("the Supabase Proxy consumes verified claims instead of discarding getClaims()", async () => {
  const proxy = await readSource("../src/lib/supabase/proxy.ts");
  const routeHandler = await readSource("../src/app/reports/export/route.ts");
  const businessGuard = await readSource("../src/lib/business.ts");
  const adminGuard = await readSource("../src/lib/admin.ts");

  assert.match(proxy, /const \{ data: claimsData, error: claimsError \} = await supabase\.auth\.getClaims\(\)/);
  assert.match(proxy, /shouldRedirectUnauthenticated\(request\.nextUrl\.pathname\)/);
  assert.match(proxy, /NextResponse\.redirect\(loginUrl\)/);
  assert.match(proxy, /typeof claimsData\?\.claims\?\.sub === "string"/);
  assert.match(routeHandler, /status: 401/);
  assert.match(businessGuard, /redirect\("\/login"\)/);
  assert.match(adminGuard, /redirect\("\/login"\)/);
});
