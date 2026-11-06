import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAccountInput = {
  requestId: string; name: string; phone: string; email: string; code: string;
  roles: string[]; managerId: string | null; password: string;
};
export function validateAdminAccountInput(input: Record<string, unknown>):
  { ok: true; value: AdminAccountInput } | { ok: false; code: "invalid" };
export function provisionAdminAccount(context: {
  authAdmin: SupabaseClient["auth"]["admin"];
  caller: SupabaseClient;
  actorId: string;
  input: AdminAccountInput;
}): Promise<{ ok: true; accountId: string } | { ok: false; code: "invalid" | "duplicate" | "forbidden" | "service" | "cleanup" }>;
