"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { executeLogin } from "@/lib/auth-login-flow.mjs";
import { getAuthCallbackUrl } from "@/lib/auth-callback-url.mjs";
import { meetsPasswordPolicy } from "@/lib/password-policy.mjs";
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

function classifyOtpDeliveryError(error: unknown): "rate-limited" | "email-not-authorized" | "email-provider" | "service" {
  const value = error !== null && typeof error === "object"
    ? error as { code?: unknown; message?: unknown; status?: unknown; name?: unknown }
    : {};
  const code = typeof value.code === "string" ? value.code.toLowerCase() : "";
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  const status = typeof value.status === "number" ? value.status : 0;

  if (
    status === 429 ||
    /rate.?limit|too many requests|over_email_send_rate_limit|over_request_rate_limit/.test(code + " " + message)
  ) return "rate-limited";
  if (
    /email_address_not_authorized|recipient.*not authorized|only.*team.*email|email.*not.*authorized|testing purposes/.test(code + " " + message)
  ) return "email-not-authorized";
  if (
    /smtp|email provider|sending email|send.*email|mail server|failed to send/.test(code + " " + message) ||
    status >= 500
  ) return "email-provider";
  return "service";
}

async function logOtpDeliveryFailure(flow: "password-change" | "password-recovery", error: unknown) {
  const value = error !== null && typeof error === "object"
    ? error as { code?: unknown; message?: unknown; status?: unknown; name?: unknown }
    : {};
  let requestId: string | null = null;
  try {
    const requestHeaders = await headers();
    requestId = requestHeaders.get("x-vercel-id") ?? requestHeaders.get("x-request-id") ?? null;
  } catch {
    // Logging must not break the response.
  }
  // Do not log the email address, OTP, access token, or raw provider message.
  console.error(JSON.stringify({
    event: "auth.otp_delivery.failed",
    flow,
    category: classifyOtpDeliveryError(error),
    providerErrorCode: typeof value.code === "string" ? value.code.slice(0, 80) : null,
    providerErrorName: typeof value.name === "string" ? value.name.slice(0, 80) : null,
    providerStatus: typeof value.status === "number" ? value.status : null,
    requestId,
  }));
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
            options: {
              data: metadata,
              emailRedirectTo: getAuthCallbackUrl({
                configuredSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
                projectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
                deploymentUrl: process.env.VERCEL_URL,
                nodeEnv: process.env.NODE_ENV,
                vercelEnvironment: process.env.VERCEL_ENV,
              }),
            },
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
    const errorCode = classifyOtpDeliveryError(error);
    await logOtpDeliveryFailure("password-change", error);
    redirect("/password/change?error=" + errorCode);
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
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    // Only disclose delivery/system failure categories, never account existence.
    const errorCode = classifyOtpDeliveryError(error);
    await logOtpDeliveryFailure("password-recovery", error);
    redirect("/password/recovery?error=" + errorCode);
  }

  // Use the same success response regardless of whether the address exists to
  // avoid turning this endpoint into an account-enumeration mechanism.
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
