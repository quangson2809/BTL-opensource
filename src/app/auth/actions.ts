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

function isTemporaryLockActive(lockedUntil: string | null) {
  return lockedUntil !== null && Date.parse(lockedUntil) > Date.now();
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const admin = createAdminClient();
    await admin.rpc("record_failed_login", { account_email: email });
    redirect("/login?error=invalid");
  }

  const admin = createAdminClient();
  const { data: account, error: accountError } = await admin
    .from("tai_khoan")
    .select("id,trang_thai,khoa_tam_den")
    .eq("id", data.user.id)
    .maybeSingle();

  if (accountError || !account) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=access");
  }

  if (isTemporaryLockActive(account.khoa_tam_den)) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=temporary-lock");
  }

  await admin.rpc("reset_login_failures", { account_id: data.user.id });

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
