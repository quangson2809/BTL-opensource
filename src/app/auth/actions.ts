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

function meetsPasswordPolicy(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function recoveryAuthenticationPresent(amr: unknown) {
  return (
    Array.isArray(amr) &&
    amr.some(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "method" in entry &&
        entry.method === "recovery",
    )
  );
}

async function requireActiveBusinessAccount() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const accountId = claimsData?.claims?.sub;

  if (claimsError || typeof accountId !== "string") {
    redirect("/login");
  }

  const { data: account } = await supabase
    .from("tai_khoan")
    .select("id")
    .eq("id", accountId)
    .maybeSingle();

  if (!account) {
    redirect("/access-denied");
  }

  return supabase;
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

  if (!meetsPasswordPolicy(password)) {
    redirect("/register?error=weak-password");
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

export async function requestPasswordChangeOtp() {
  const supabase = await requireActiveBusinessAccount();
  const { error } = await supabase.auth.reauthenticate();

  if (error) {
    redirect("/password/change?error=otp-request");
  }

  redirect("/password/change?status=otp-sent");
}

export async function changePassword(formData: FormData) {
  const otp = field(formData, "otp");
  const password = rawField(formData, "new_password");
  const confirmPassword = rawField(formData, "confirm_password");

  if (!otp || !password || !confirmPassword) {
    redirect("/password/change?error=missing");
  }

  if (password !== confirmPassword) {
    redirect("/password/change?error=mismatch");
  }

  if (!meetsPasswordPolicy(password)) {
    redirect("/password/change?error=weak-password");
  }

  const supabase = await requireActiveBusinessAccount();
  const { error } = await supabase.auth.updateUser({
    password,
    nonce: otp,
  });

  if (error) {
    if (error.code === "same_password") {
      redirect("/password/change?error=same-password");
    }

    redirect("/password/change?error=otp");
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?status=password-changed");
}

export async function requestPasswordRecovery(formData: FormData) {
  const email = field(formData, "email").toLowerCase();

  if (!email) {
    redirect("/password/recovery?error=missing");
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email);

  // Use the same response regardless of whether the address exists. Supabase
  // intentionally avoids account enumeration on this endpoint.
  redirect(
    `/password/recovery/verify?email=${encodeURIComponent(email)}&status=otp-sent`,
  );
}

export async function verifyRecoveryOtp(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const otp = field(formData, "otp");

  if (!email || !otp) {
    redirect(
      `/password/recovery/verify?email=${encodeURIComponent(email)}&error=missing`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "recovery",
  });

  if (error || !data.session) {
    redirect(
      `/password/recovery/verify?email=${encodeURIComponent(email)}&error=otp`,
    );
  }

  redirect("/password/recovery/reset");
}

export async function resetRecoveredPassword(formData: FormData) {
  const password = rawField(formData, "new_password");
  const confirmPassword = rawField(formData, "confirm_password");

  if (!password || !confirmPassword) {
    redirect("/password/recovery/reset?error=missing");
  }

  if (password !== confirmPassword) {
    redirect("/password/recovery/reset?error=mismatch");
  }

  if (!meetsPasswordPolicy(password)) {
    redirect("/password/recovery/reset?error=weak-password");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !recoveryAuthenticationPresent(claimsData?.claims?.amr)
  ) {
    redirect("/password/recovery?error=session");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.code === "same_password") {
      redirect("/password/recovery/reset?error=same-password");
    }

    redirect("/password/recovery/reset?error=update");
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?status=password-reset");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
