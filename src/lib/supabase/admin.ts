/**
 * Tạo Supabase client đặc quyền chỉ trên server cho các bước kiểm tra Auth cần đọc dữ liệu ngoài
 * quyền của phiên thông thường.
 */

import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  }

  // Client đặc quyền có thể vượt RLS: chỉ dùng ở luồng server đã kiểm soát, không thay client theo
  // phiên cho CRUD nghiệp vụ.
  return createSupabaseClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
