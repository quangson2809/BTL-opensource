"use client";

/**
 * Tạo Supabase browser client từ cấu hình công khai cho các component chạy ở trình duyệt.
 */

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();

  return createBrowserClient(url, publishableKey);
}
