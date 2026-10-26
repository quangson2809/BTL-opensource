"use server";

import { redirect } from "next/navigation";

import { requireActiveBusinessAccount } from "@/lib/business";
import { validateAgencyProfileName, validateAgencyProfilePhone } from "@/lib/agency-profile-validation.mjs";

export async function updateAgencyProfile(formData: FormData) {
  const { supabase, accountId } = await requireActiveBusinessAccount();
  const validation = validateAgencyProfileName(formData.get("ho_ten"));

  if (!validation.ok) {
    redirect("/profile?error=" + validation.code);
  }

  const phoneValidation = validateAgencyProfilePhone(formData.get("so_dien_thoai"));
  if (!phoneValidation.ok) {
    redirect("/profile?error=" + phoneValidation.code);
  }

  // Never trust an account ID supplied by the browser. The authenticated
  // session determines the only row this action is allowed to target.
  const { data, error } = await supabase
    .from("tai_khoan")
    .update({ ho_ten: validation.value, so_dien_thoai: phoneValidation.value })
    .eq("id", accountId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error?.code === "23505") redirect("/profile?error=phone-taken");
    // Give the user an actionable category without exposing SQL/provider details.
    if (error?.code === "42501" || error?.code === "PGRST301") {
      redirect("/profile?error=permission");
    }
    if (error?.code === "23514" || error?.code === "22P02" || error?.code === "22001") {
      redirect("/profile?error=invalid-data");
    }
    if (!error && !data) redirect("/profile?error=not-updated");
    redirect("/profile?error=service");
  }

  redirect("/profile?status=saved");
}
