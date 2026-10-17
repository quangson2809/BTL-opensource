"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { executeLogin } from "@/lib/auth-login-flow.mjs";
import {
  createLoginFailureLog,
  type LoginFailureCategory,
} from "@/lib/auth-login-errors.mjs";
import {
  createRegistrationFailureLog,
  executeRegistration,
  type RegistrationFailureCategory,
} from "@/lib/auth-registration.mjs";

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

function getAuthCallbackUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const deploymentHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  const deploymentOrigin = deploymentHost
    ? new URL(
        deploymentHost.startsWith("http://") || deploymentHost.startsWith("https://")
          ? deploymentHost
          : `https://${deploymentHost}`,
      ).origin
    : null;
  const siteUrl =
    configuredSiteUrl || deploymentOrigin || "http://localhost:3000";
  const parsedUrl = new URL(siteUrl);

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error("Invalid site URL configuration.");
  }

  return new URL("/auth/callback", parsedUrl.origin).toString();
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


async function logRegistrationFailure({
  category,
  error,
  source,
  event,
}: {
  category: RegistrationFailureCategory;
  error?: unknown;
  source: string;
  event?: string;
}) {
  let requestId: string | null = null;

  try {
    const requestHeaders = await headers();
    requestId =
      requestHeaders.get("x-vercel-id") ??
      requestHeaders.get("x-request-id") ??
      null;
  } catch {
    // Missing request context must not prevent registration error handling.
  }

  console.warn(
    JSON.stringify(
      createRegistrationFailureLog({ category, error, source, requestId, event }),
    ),
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
  const destination = await executeRegistration({
    fullName: field(formData, "ho_ten"),
    email: field(formData, "email").toLowerCase(),
    phone: field(formData, "so_dien_thoai"),
    agentCode: field(formData, "ma_dai_ly"),
    managerCode: field(formData, "ma_nguoi_quan_ly"),
    password: rawField(formData, "password"),
    createAuthClient: async () => {
      const supabase = await createClient();
      return {
        signUp: async ({ email, password, metadata }) => {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata, emailRedirectTo: getAuthCallbackUrl() },
          });
          return {
            user: data.user
              ? {
                  id: data.user.id,
                  identityCount: Array.isArray(data.user.identities)
                    ? data.user.identities.length
                    : null,
                }
              : null,
            hasSession: Boolean(data.session),
            error,
          };
        },
        signOutLocal: async () => {
          const { error } = await supabase.auth.signOut({ scope: "local" });
          return { error };
        },
      };
    },
    createAdminClient: () => {
      const admin = createAdminClient();
      return {
        findExistingPhone: async (phone) => {
          const { data, error } = await admin
            .from("tai_khoan")
            .select("id")
            .eq("so_dien_thoai", phone)
            .maybeSingle();
          return { exists: Boolean(data), error };
        },
        findExistingAgentCode: async (agentCode) => {
          const { data, error } = await admin.from("tai_khoan").select("id").eq("ma_dai_ly", agentCode).maybeSingle();
          return { exists: Boolean(data), error };
        },
        findEligibleManagerByAgentCode: async (managerCode) => {
          const { data: manager, error: managerError } = await admin.from("tai_khoan").select("id,trang_thai").eq("ma_dai_ly", managerCode).maybeSingle();
          if (managerError) return { eligible: false, error: managerError };
          if (!manager || manager.trang_thai !== "DANG_HOAT_DONG") return { eligible: false, error: null };
          const { data: assignments, error: roleError } = await admin.from("phan_cong_vai_tro").select("vai_tro(ma_vai_tro)").eq("tai_khoan_id", manager.id);
          if (roleError) return { eligible: false, error: roleError };
          const eligible = (assignments ?? []).some((assignment) => {
            const role = Array.isArray(assignment.vai_tro) ? assignment.vai_tro[0] : assignment.vai_tro;
            return role?.ma_vai_tro === "DM" || role?.ma_vai_tro === "UM";
          });
          return { eligible, error: null };
        },
      };
    },
    logFailure: logRegistrationFailure,
  });

  redirect(destination);
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
