"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function accountPath(accountId: string) {
  return `/admin/accounts/${encodeURIComponent(accountId)}`;
}

function refreshAccountPages(accountId: string) {
  revalidatePath("/admin/accounts");
  revalidatePath(accountPath(accountId));
  revalidatePath("/admin/roles");
}

export async function approveAccount(formData: FormData) {
  const accountId = field(formData, "account_id");

  if (!accountId) {
    redirect("/admin/accounts?error=invalid-account");
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_approve_account", {
    target_account_id: accountId,
  });

  if (error) {
    redirect(`${accountPath(accountId)}?error=approve`);
  }

  refreshAccountPages(accountId);
  redirect(`${accountPath(accountId)}?status=approved`);
}

export async function lockAccount(formData: FormData) {
  const accountId = field(formData, "account_id");

  if (!accountId) {
    redirect("/admin/accounts?error=invalid-account");
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_lock_account", {
    target_account_id: accountId,
  });

  if (error) {
    redirect(`${accountPath(accountId)}?error=lock`);
  }

  refreshAccountPages(accountId);
  redirect(`${accountPath(accountId)}?status=locked`);
}

export async function unlockAccount(formData: FormData) {
  const accountId = field(formData, "account_id");

  if (!accountId) {
    redirect("/admin/accounts?error=invalid-account");
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_unlock_account", {
    target_account_id: accountId,
  });

  if (error) {
    redirect(`${accountPath(accountId)}?error=unlock`);
  }

  refreshAccountPages(accountId);
  redirect(`${accountPath(accountId)}?status=unlocked`);
}

export async function assignRole(formData: FormData) {
  const accountId = field(formData, "account_id");
  const roleId = field(formData, "role_id");

  if (!accountId || !roleId) {
    redirect("/admin/accounts?error=invalid-role");
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_assign_role", {
    target_account_id: accountId,
    target_role_id: roleId,
  });

  if (error) {
    redirect(`${accountPath(accountId)}?error=assign-role`);
  }

  refreshAccountPages(accountId);
  redirect(`${accountPath(accountId)}?status=role-assigned`);
}

export async function revokeRole(formData: FormData) {
  const accountId = field(formData, "account_id");
  const roleId = field(formData, "role_id");

  if (!accountId || !roleId) {
    redirect("/admin/accounts?error=invalid-role");
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_revoke_role", {
    target_account_id: accountId,
    target_role_id: roleId,
  });

  if (error) {
    redirect(`${accountPath(accountId)}?error=revoke-role`);
  }

  refreshAccountPages(accountId);
  redirect(`${accountPath(accountId)}?status=role-revoked`);
}
