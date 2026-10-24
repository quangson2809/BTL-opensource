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
    // A unique-constraint violation means another account already owns this phone.
    if (error?.code === "23505") redirect("/profile?error=phone-taken");
    // Avoid sending database/provider details to the user.
    redirect("/profile?error=save");
  }

  redirect("/profile?status=saved");
}
