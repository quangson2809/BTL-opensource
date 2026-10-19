import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { shouldRedirectUnauthenticated } from "@/lib/supabase/proxy-route-policy.mjs";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  // Preserve cookie refresh/cleanup even when an unauthenticated request is redirected.
  const refreshedCookieWriters = new Map<
    string,
    (response: NextResponse) => void
  >();
  const { url, publishableKey } = getSupabasePublicConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
          refreshedCookieWriters.set(name, (response) => {
            response.cookies.set(name, value, options);
          });
        });
      },
    },
  });

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const isAuthenticated = !claimsError && typeof claimsData?.claims?.sub === "string";

  if (
    shouldRedirectUnauthenticated(request.nextUrl.pathname) &&
    !isAuthenticated
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);
    refreshedCookieWriters.forEach((writeCookie) => writeCookie(redirectResponse));
    return redirectResponse;
  }

  // This is an early navigation guard only. Page data, Server Actions, and Route
  // Handlers must continue enforcing authorization at their own server boundary.
  return supabaseResponse;
}
