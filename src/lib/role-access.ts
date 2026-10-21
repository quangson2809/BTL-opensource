import "server-only";

import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolve the signed-in account's role codes through its own role assignments.
 * The RLS policy restricts this query to the current account and active sessions.
 * This avoids exposing the generic SECURITY DEFINER has_role(text) helper as an RPC.
 */
export async function getCurrentRoleCodes(
  supabase: ServerSupabaseClient,
  accountId: string,
): Promise<string[] | null> {
  const { data: assignments, error: assignmentError } = await supabase
    .from("phan_cong_vai_tro")
    .select("vai_tro_id")
    .eq("tai_khoan_id", accountId);

  if (assignmentError || !assignments) {
    return null;
  }

  const roleIds = [...new Set(assignments.map((assignment) => assignment.vai_tro_id))];
  if (roleIds.length === 0) {
    return [];
  }

  const { data: roles, error: rolesError } = await supabase
    .from("vai_tro")
    .select("ma_vai_tro")
    .in("id", roleIds);

  if (rolesError || !roles) {
    return null;
  }

  return roles.map((role) => role.ma_vai_tro);
}
