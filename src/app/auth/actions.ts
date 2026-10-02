"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function rawField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function register(formData: FormData) {
  const hoTen = field(formData, "ho_ten");
  const email = field(formData, "email").toLowerCase();
  const soDienThoai = field(formData, "so_dien_thoai");
  const maDaiLy = field(formData, "ma_dai_ly");
  const password = rawField(formData, "password");

  if (!hoTen || !email || !soDienThoai || !maDaiLy || !password) {
    redirect("/register?error=missing");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        registration_type: "SA_SELF_REGISTRATION",
        ho_ten: hoTen,
        so_dien_thoai: soDienThoai,
        ma_dai_ly: maDaiLy,
      },
    },
  });

  if (error) {
    redirect("/register?error=registration");
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?status=registered");
}

export async function login(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const password = rawField(formData, "password");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const supabase = await createClient();

  // The password-verification hook owns failed-attempt bookkeeping and the
  // 6-attempt/30-minute lock. Keeping this action free of duplicate counters
  // ensures browser, server and direct Auth API attempts share one boundary.
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect("/login?error=invalid");
  }

  // Business state remains separate from Supabase Auth identity state.
  // The server-only client is intentionally narrow: it reads only the account
  // state needed to choose the post-auth response. Business data access still
  // uses the user's JWT and database RLS.
  const admin = createAdminClient();
  const { data: account, error: accountError } = await admin
    .from("tai_khoan")
    .select("id,trang_thai")
    .eq("id", data.user.id)
    .maybeSingle();

  if (accountError || !account) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=access");
  }

  if (account.trang_thai === "CHO_PHE_DUYET") {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=pending");
  }

  if (account.trang_thai === "KHOA") {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=locked");
  }

  if (account.trang_thai !== "DANG_HOAT_DONG") {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=access");
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
