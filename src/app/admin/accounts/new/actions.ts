"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionAdminAccount, validateAdminAccountInput } from "@/lib/admin-account-creation.mjs";
import { isUuid } from "@/lib/input-validation.mjs";

export async function createAccount(formData: FormData) {
  const { supabase, accountId } = await requireAdmin();
  const requestId = formData.get("request_id");
  const retry = typeof requestId === "string" && isUuid(requestId) ? "&request=" + encodeURIComponent(requestId) : "";
  const validated = validateAdminAccountInput({
    requestId, name: formData.get("ho_ten"), email: formData.get("email"), phone: formData.get("so_dien_thoai"),
    code: formData.get("ma_dai_ly"), password: formData.get("password"),
    managerId: formData.get("manager_id") || null, roles: formData.getAll("role_ids"),
  });
  if (!validated.ok) redirect("/admin/accounts/new?error=invalid" + retry);
  let result;
  try {
    const admin = createAdminClient();
    result = await provisionAdminAccount({ authAdmin: admin.auth.admin, caller: supabase, actorId: accountId, input: validated.value });
  } catch {
    redirect("/admin/accounts/new?error=service" + retry);
  }
  if (!result.ok) redirect("/admin/accounts/new?error=" + result.code + retry);
  revalidatePath("/admin/accounts");
  redirect("/admin/accounts/" + result.accountId + "?status=created");
}
