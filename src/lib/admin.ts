/**
 * Guard phía server cho ADMIN: xác thực claims và đọc vai trò của tài khoản trước khi trả
 * Supabase client cùng accountId.
 */

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentRoleCodes } from "@/lib/role-access";

/**
 * Dừng request bằng redirect nếu chưa đăng nhập hoặc không có ADMIN; RPC/RLS vẫn kiểm tra quyền
 * ở database.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const accountId = claimsData?.claims?.sub;

  if (claimsError || typeof accountId !== "string") {
    redirect("/login");
  }

  const roleCodes = await getCurrentRoleCodes(supabase, accountId);

  if (!roleCodes?.includes("ADMIN")) {
    redirect("/access-denied");
  }

  return { supabase, accountId };
}
