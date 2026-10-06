import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireBusinessAccount() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const accountId = claimsData?.claims?.sub;

  if (claimsError || typeof accountId !== "string") {
    redirect("/login");
  }

  const { data: account, error: accountError } = await supabase
    .from("tai_khoan")
    .select("id,ho_ten,email,trang_thai")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError || !account) {
    redirect("/access-denied");
  }

  return { supabase, accountId, account };
}

export async function requireManager() {
  const context = await requireBusinessAccount();
  const [dmResult, umResult] = await Promise.all([
    context.supabase.rpc("has_role", { role_code: "DM" }),
    context.supabase.rpc("has_role", { role_code: "UM" }),
  ]);

  if (
    dmResult.error ||
    umResult.error ||
    (dmResult.data !== true && umResult.data !== true)
  ) {
    redirect("/access-denied");
  }

  return {
    ...context,
    isDm: dmResult.data === true,
    isUm: umResult.data === true,
  };
}

export async function requireDm() {
  const context = await requireBusinessAccount();
  const { data: isDm, error } = await context.supabase.rpc("has_role", {
    role_code: "DM",
  });

  if (error || isDm !== true) {
    redirect("/access-denied");
  }

  return context;
}
