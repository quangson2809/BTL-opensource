"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/input-validation.mjs";

const SYSTEM_ROLE_CODES = new Set(["ADMIN", "DM", "UM", "SA"]);

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function permissionIds(formData: FormData) {
  const ids: string[] = [];
  for (const value of formData.getAll("permission_ids")) {
    if (typeof value !== "string" || !isUuid(value)) {
      return null;
    }
    ids.push(value);
  }
  return [...new Set(ids)];
}

function validRoleName(value: string) {
  return value.length > 0;
}

function refreshRolePages() {
  revalidatePath("/admin/roles");
  revalidatePath("/admin/accounts");
}

export async function createRole(formData: FormData) {
  const roleCode = field(formData, "ma_vai_tro").toUpperCase();
  const roleName = field(formData, "ten_vai_tro");
  const roleDescription = field(formData, "mo_ta");
  const selectedPermissions = permissionIds(formData);

  if (
    !/^[A-Z][A-Z0-9_]*$/.test(roleCode) ||
    SYSTEM_ROLE_CODES.has(roleCode) ||
    !validRoleName(roleName) ||
    selectedPermissions === null
  ) {
    redirect("/admin/roles/new?error=invalid");
  }

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_create_role", {
    role_code: roleCode,
    role_name: roleName,
    role_description: roleDescription || null,
    permission_ids: selectedPermissions,
  });

  if (error) {
    redirect(
      "/admin/roles/new?error=" +
        (error.code === "23505"
          ? "duplicate"
          : error.code === "22023"
            ? "invalid"
            : error.code === "42501"
              ? "forbidden"
              : "save"),
    );
  }

  if (!data || !isUuid(data)) {
    redirect("/admin/roles/new?error=save");
  }

  refreshRolePages();
  redirect("/admin/roles?status=created");
}

export async function updateRole(formData: FormData) {
  const roleId = field(formData, "role_id");
  const roleName = field(formData, "ten_vai_tro");
  const roleDescription = field(formData, "mo_ta");
  const selectedPermissions = permissionIds(formData);

  if (!isUuid(roleId)) {
    redirect("/admin/roles?error=invalid");
  }

  if (!validRoleName(roleName) || selectedPermissions === null) {
    redirect(
      "/admin/roles/" + encodeURIComponent(roleId) + "/edit?error=invalid",
    );
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_update_role", {
    target_role_id: roleId,
    role_name: roleName,
    role_description: roleDescription || null,
    permission_ids: selectedPermissions,
  });

  if (error) {
    redirect(
      "/admin/roles/" +
        encodeURIComponent(roleId) +
        "/edit?error=" +
        (error.code === "23505"
          ? "duplicate"
          : error.code === "22023"
            ? "invalid"
            : error.code === "42501"
              ? "forbidden"
              : "save"),
    );
  }

  refreshRolePages();
  revalidatePath("/admin/roles/" + roleId + "/edit");
  redirect("/admin/roles?status=updated&id=" + encodeURIComponent(roleId));
}
