import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const accountId = claimsData?.claims?.sub;

  if (claimsError || typeof accountId !== "string") {
    redirect("/login");
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    role_code: "ADMIN",
  });

  if (roleError || isAdmin !== true) {
    redirect("/access-denied");
  }

  return { supabase, accountId };
}
