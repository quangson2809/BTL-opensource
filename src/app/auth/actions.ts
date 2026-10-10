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

  // Keep failed-attempt bookkeeping out of this server action. Local/CI can
  // exercise the stronger Password Verification Hook, while hosted Free
  // production relies on Supabase provider rate limiting. An app-only counter
  // would not be a security boundary because the public Auth API is callable
  // directly, so production does not claim an exact 6-attempt/30-minute lock.
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
  const password = rawField(formData, "new_password");
  const confirmPassword = rawField(formData, "confirm_password");

  const verifyPath = `/password/recovery/verify?email=${encodeURIComponent(email)}`;

  if (!email || !otp || !password || !confirmPassword) {
    redirect(`${verifyPath}&error=missing`);
  }

  if (password !== confirmPassword) {
    redirect(`${verifyPath}&error=mismatch`);
  }

  if (!meetsPasswordPolicy(password)) {
    redirect(`${verifyPath}&error=weak-password`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "recovery",
  });

  if (error || !data.session) {
    redirect(`${verifyPath}&error=otp`);
  }

  // Complete recovery immediately inside the same server action. The temporary
  // OTP-authenticated session is never promoted into an application session;
  // database RLS independently requires a password-authenticated JWT.
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    await supabase.auth.signOut({ scope: "local" });

    if (updateError.code === "same_password") {
      redirect(`${verifyPath}&error=same-password`);
    }

    redirect(`${verifyPath}&error=update`);
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?status=password-reset");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
