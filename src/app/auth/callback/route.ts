import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid", requestUrl.origin));
  }

  // Email confirmation must not bypass the separate Admin approval state.
  // Clear the temporary Auth session and require normal password login after approval.
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(
    new URL("/login?status=email-confirmed", requestUrl.origin),
  );
}
