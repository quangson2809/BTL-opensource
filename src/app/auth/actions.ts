"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { executeLogin } from "@/lib/auth-login-flow.mjs";
import {
  createLoginFailureLog,
  type LoginFailureCategory,
} from "@/lib/auth-login-errors.mjs";

import { requireActiveBusinessAccount } from "@/lib/business";
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

async function logLoginFailure(
  category: LoginFailureCategory,
  error?: unknown,
  source = "supabase-auth",
) {
  let requestId: string | null = null;

  try {
    const requestHeaders = await headers();
    requestId =
      requestHeaders.get("x-vercel-id") ??
      requestHeaders.get("x-request-id") ??
      null;
  } catch {
    // Logging must not break the authentication response if request context is unavailable.
  }

  console.warn(
    JSON.stringify(createLoginFailureLog({ category, error, requestId, source })),
  );
}

function meetsPasswordPolicy(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
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

  const destination = await executeLogin({
    email,
    password,
    createAuthClient: async () => {
      const supabase = await createClient();
      return {
        signInWithPassword: async (credentials) => {
          const result = await supabase.auth.signInWithPassword(credentials);
          return {
            data: {
              user: result.data.user ? { id: result.data.user.id } : null,
            },
            error: result.error,
          };
        },
        signOutLocal: async () => {
          const result = await supabase.auth.signOut({ scope: "local" });
          return { error: result.error };
        },
      };
    },
    createAdminClient: () => ({
      getAccount: async (userId) => {
        const admin = createAdminClient();
        const result = await admin
          .from("tai_khoan")
          .select("id,trang_thai")
          .eq("id", userId)
          .maybeSingle();
        return {
          data: result.data
            ? { id: result.data.id, trang_thai: result.data.trang_thai }
            : null,
          error: result.error,
        };
      },
    }),
    logFailure: logLoginFailure,
  });

  redirect(destination);
}

export async function requestPasswordChangeOtp() {
  const { supabase } = await requireActiveBusinessAccount();
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

  const { supabase } = await requireActiveBusinessAccount();
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

  // Use the same response regardless of whether the address exists to avoid
  // turning this endpoint into an account-enumeration mechanism.
  redirect(
    "/password/recovery/verify?email=" + encodeURIComponent(email) + "&status=otp-sent",
  );
}

export async function verifyRecoveryOtp(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const otp = field(formData, "otp");
  const password = rawField(formData, "new_password");
  const confirmPassword = rawField(formData, "confirm_password");

  const verifyPath = "/password/recovery/verify?email=" + encodeURIComponent(email);

  if (!email || !otp || !password || !confirmPassword) {
    redirect(verifyPath + "&error=missing");
  }

  if (password !== confirmPassword) {
    redirect(verifyPath + "&error=mismatch");
  }

  if (!meetsPasswordPolicy(password)) {
    redirect(verifyPath + "&error=weak-password");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "recovery",
  });

  if (error || !data.session) {
    redirect(verifyPath + "&error=otp");
  }

  // Do not promote the temporary OTP session into an application session.
  // RLS independently requires a password-authenticated JWT.
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    await supabase.auth.signOut({ scope: "local" });

    if (updateError.code === "same_password") {
      redirect(verifyPath + "&error=same-password");
    }

    redirect(verifyPath + "&error=update");
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?status=password-reset");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
