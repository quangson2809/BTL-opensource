const PROTECTED_ROUTE_PREFIXES = Object.freeze([
  "/dashboard",
  "/customers",
  "/activities",
  "/notifications",
  "/reports",
  "/personnel",
  "/admin",
  "/profile",
  "/password/change",
]);

// This route handler owns the unauthenticated HTTP contract (401), so Proxy
// must not turn it into a browser redirect.
const ROUTE_HANDLER_AUTH_EXEMPTIONS = new Set(["/reports/export"]);

export function shouldRedirectUnauthenticated(pathname) {
  if (ROUTE_HANDLER_AUTH_EXEMPTIONS.has(pathname)) {
    return false;
  }

  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
