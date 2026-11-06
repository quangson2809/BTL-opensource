"use server";

/**
 * Server Action quản trị tài khoản qua các RPC có kiểm tra quyền trong database; làm mới các
 * trang liên quan sau khi thành công.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/input-validation.mjs";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function accountPath(accountId: string) {
  return "/admin/accounts/" + encodeURIComponent(accountId);
}

/**
 * Làm mất hiệu lực cache các trang cùng hiển thị trạng thái tài khoản hoặc danh sách vai trò.
 */
function refreshAccountPages(accountId: string) {
  revalidatePath("/admin/accounts");
  revalidatePath(accountPath(accountId));
  revalidatePath("/admin/roles");
}

/**
 * Ủy quyền cho RPC kiểm tra trạng thái và phê duyệt; chỉ làm mới trang sau khi RPC thành công.
 */
export async function approveAccount(formData: FormData) {
  const accountId = field(formData, "account_id");
  if (!isUuid(accountId)) redirect("/admin/accounts?error=invalid-account");

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_approve_account", {
    target_account_id: accountId,
  });

  if (error) redirect(accountPath(accountId) + "?error=approve");

  refreshAccountPages(accountId);
  redirect(accountPath(accountId) + "?status=approved");
}

/**
 * RPC thực thi quy tắc khóa và chống tự làm mất quyền quản trị; UI không tự cập nhật trạng thái
 * bảng.
 */
export async function lockAccount(formData: FormData) {
  const accountId = field(formData, "account_id");
  if (!isUuid(accountId)) redirect("/admin/accounts?error=invalid-account");

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_lock_account", {
    target_account_id: accountId,
  });

  if (error) redirect(accountPath(accountId) + "?error=lock");

  refreshAccountPages(accountId);
  redirect(accountPath(accountId) + "?status=locked");
}

/**
 * Gửi yêu cầu mở khóa tới RPC có kiểm tra trạng thái tài khoản đích.
 */
export async function unlockAccount(formData: FormData) {
  const accountId = field(formData, "account_id");
  if (!isUuid(accountId)) redirect("/admin/accounts?error=invalid-account");

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_unlock_account", {
    target_account_id: accountId,
  });

  if (error) redirect(accountPath(accountId) + "?error=unlock");

  refreshAccountPages(accountId);
  redirect(accountPath(accountId) + "?status=unlocked");
}

/**
 * Kiểm tra UUID ở biên form, rồi giao RPC xác minh quyền quản trị và gán vai trò.
 */
export async function assignRole(formData: FormData) {
  const accountId = field(formData, "account_id");
  const roleId = field(formData, "role_id");
  if (!isUuid(accountId) || !isUuid(roleId)) {
    redirect("/admin/accounts?error=invalid-role");
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_assign_role", {
    target_account_id: accountId,
    target_role_id: roleId,
  });

  if (error) redirect(accountPath(accountId) + "?error=assign-role");

  refreshAccountPages(accountId);
  redirect(accountPath(accountId) + "?status=role-assigned");
}

/**
 * RPC thu hồi vai trò và bảo vệ quyền quản trị còn sử dụng được; không xóa phân công trực tiếp
 * từ form.
 */
export async function revokeRole(formData: FormData) {
  const accountId = field(formData, "account_id");
  const roleId = field(formData, "role_id");
  if (!isUuid(accountId) || !isUuid(roleId)) {
    redirect("/admin/accounts?error=invalid-role");
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_revoke_role", {
    target_account_id: accountId,
    target_role_id: roleId,
  });

  if (error) redirect(accountPath(accountId) + "?error=revoke-role");

  refreshAccountPages(accountId);
  redirect(accountPath(accountId) + "?status=role-revoked");
}
