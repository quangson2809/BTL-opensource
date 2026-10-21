import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentRoleCodes } from "@/lib/role-access";

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

export async function requireActiveBusinessAccount() {
  const context = await requireBusinessAccount();

  if (context.account.trang_thai === "CHO_PHE_DUYET") {
    redirect("/login?error=pending");
  }
  if (context.account.trang_thai === "KHOA") {
    redirect("/login?error=locked");
  }
  if (context.account.trang_thai !== "DANG_HOAT_DONG") {
    redirect("/access-denied");
  }

  return context;
}

export async function requireManager() {
  const context = await requireBusinessAccount();
  const roleCodes = await getCurrentRoleCodes(context.supabase, context.accountId);

  if (!roleCodes || (!roleCodes.includes("DM") && !roleCodes.includes("UM"))) {
    redirect("/access-denied");
  }

  return {
    ...context,
    isDm: roleCodes.includes("DM"),
    isUm: roleCodes.includes("UM"),
  };
}

export async function requireDm() {
  const context = await requireBusinessAccount();
  const roleCodes = await getCurrentRoleCodes(context.supabase, context.accountId);

  if (!roleCodes?.includes("DM")) {
    redirect("/access-denied");
  }

  return context;
}
