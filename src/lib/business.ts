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

  // The DM role alone is not sufficient: ADMIN must explicitly grant
  // NOTIFICATION_MANAGE in the role-permission editor.
  const { data: assignments, error: assignmentsError } = await context.supabase
    .from("phan_cong_vai_tro")
    .select("vai_tro_id")
    .eq("tai_khoan_id", context.accountId);

  if (assignmentsError || !assignments?.length) {
    redirect("/access-denied");
  }

  const { data: mappings, error: mappingsError } = await context.supabase
    .from("phan_quyen_vai_tro")
    .select("quyen_id")
    .in("vai_tro_id", assignments.map((assignment) => assignment.vai_tro_id));

  if (mappingsError || !mappings?.length) {
    redirect("/access-denied");
  }

  const { data: permission, error: permissionError } = await context.supabase
    .from("quyen")
    .select("id")
    .eq("ma_quyen", "NOTIFICATION_MANAGE")
    .maybeSingle();

  if (
    permissionError ||
    !permission ||
    !mappings.some((mapping) => mapping.quyen_id === permission.id)
  ) {
    redirect("/access-denied");
  }

  return context;
}
