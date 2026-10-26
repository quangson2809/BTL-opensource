import { meetsPasswordPolicy } from "./password-policy.mjs";
import {
  asRecord,
  errorStringField,
  normalizeOccurredAt,
  normalizeProviderErrorStatus,
  safeLogToken,
} from "./safe-error-logging.mjs";

export const REGISTRATION_FAILURE_CATEGORIES = Object.freeze({
  INVALID_EMAIL: "INVALID_EMAIL",
  WEAK_PASSWORD: "WEAK_PASSWORD",
  EMAIL_UNAVAILABLE: "EMAIL_UNAVAILABLE",
  PHONE_IN_USE: "PHONE_IN_USE",
  AGENT_CODE_IN_USE: "AGENT_CODE_IN_USE",
  INVALID_MANAGER: "INVALID_MANAGER",
  RATE_LIMITED: "RATE_LIMITED",
  DATABASE_ERROR: "DATABASE_ERROR",
  PROVISIONING_ERROR: "PROVISIONING_ERROR",
  AUTH_SERVICE_ERROR: "AUTH_SERVICE_ERROR",
});

export const REGISTRATION_ERROR_MESSAGES = Object.freeze({
  missing: "Vui lòng điền đầy đủ thông tin bắt buộc.",
  "invalid-email": "Email chưa đúng định dạng. Vui lòng kiểm tra lại.",
  "weak-password": "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ thường, chữ hoa và số.",
  "email-unavailable": "Email này chưa thể sử dụng để đăng ký. Nếu bạn đã có tài khoản, vui lòng đăng nhập hoặc dùng Quên mật khẩu.",
  "phone-in-use": "Số điện thoại này đã được sử dụng. Vui lòng kiểm tra lại.",
  "agent-code-in-use": "Mã đại lý này đã được sử dụng. Vui lòng kiểm tra lại.",
  "invalid-manager": "Mã người quản lý không hợp lệ hoặc người quản lý chưa được kích hoạt.",
  "rate-limited": "Bạn đã gửi quá nhiều yêu cầu đăng ký. Vui lòng chờ rồi thử lại.",
  service: "Hiện không thể kiểm tra hoặc tạo tài khoản do sự cố dịch vụ. Vui lòng thử lại sau.",
  provisioning: "Không thể tạo hồ sơ đại lý do lỗi liên kết dữ liệu. Vui lòng thử lại sau; nếu lỗi tiếp diễn, hãy liên hệ quản trị viên.",
});

export const REGISTRATION_STATUS_MESSAGES = Object.freeze({
  registered: "Đăng ký thành công. Tài khoản đang chờ quản trị viên phê duyệt. Bạn có thể đăng nhập sau khi được kích hoạt.",
  "verify-email": "Thông tin đăng ký đã được tiếp nhận. Vui lòng xác minh email theo hướng dẫn trong hộp thư trước khi đăng nhập. Tài khoản vẫn cần quản trị viên phê duyệt.",
});

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_request_rate_limit_exceeded",
  "over_email_send_rate_limit",
  "over_sms_send_rate_limit",
  "rate_limit_exceeded",
  "too_many_requests",
]);

export function validateRegistrationInput({
  fullName,
  email,
  phone,
  agentCode,
  managerCode,
  password,
}) {
  if (
    !fullName?.trim() ||
    !email?.trim() ||
    !phone?.trim() ||
    !agentCode?.trim() ||
    !managerCode?.trim() ||
    !password
  ) {
    return "/register?error=missing";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "/register?error=invalid-email";
  }

  if (!meetsPasswordPolicy(password)) {
    return "/register?error=weak-password";
  }

  return null;
}

export function classifyRegistrationAuthError(error) {
  const value = asRecord(error);
  if (!value) return REGISTRATION_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR;

  const code = typeof value.code === "string" ? value.code.toLowerCase() : "";
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  const status = value.status;

  if (
    code === "email_exists" ||
    code === "user_already_exists" ||
    code === "identity_already_exists"
  ) {
    return REGISTRATION_FAILURE_CATEGORIES.EMAIL_UNAVAILABLE;
  }

  if (code === "email_address_invalid") {
    return REGISTRATION_FAILURE_CATEGORIES.INVALID_EMAIL;
  }

  if (
    code === "weak_password" ||
    code === "password_too_short" ||
    value.name === "AuthWeakPasswordError"
  ) {
    return REGISTRATION_FAILURE_CATEGORIES.WEAK_PASSWORD;
  }

  if (RATE_LIMIT_CODES.has(code) || status === 429) {
    return REGISTRATION_FAILURE_CATEGORIES.RATE_LIMITED;
  }

  // Supabase Auth may wrap a Postgres trigger exception as this generic Auth
  // error. Compare only the known envelope; never show this raw text to users.
  if (message.includes("database error saving new user")) {
    return REGISTRATION_FAILURE_CATEGORIES.PROVISIONING_ERROR;
  }

  return REGISTRATION_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR;
}

export function getRegistrationErrorQueryCode(category) {
  switch (category) {
    case REGISTRATION_FAILURE_CATEGORIES.INVALID_EMAIL:
      return "invalid-email";
    case REGISTRATION_FAILURE_CATEGORIES.WEAK_PASSWORD:
      return "weak-password";
    case REGISTRATION_FAILURE_CATEGORIES.EMAIL_UNAVAILABLE:
      return "email-unavailable";
    case REGISTRATION_FAILURE_CATEGORIES.PHONE_IN_USE:
      return "phone-in-use";
    case REGISTRATION_FAILURE_CATEGORIES.AGENT_CODE_IN_USE:
      return "agent-code-in-use";
    case REGISTRATION_FAILURE_CATEGORIES.INVALID_MANAGER:
      return "invalid-manager";
    case REGISTRATION_FAILURE_CATEGORIES.RATE_LIMITED:
      return "rate-limited";
    case REGISTRATION_FAILURE_CATEGORIES.PROVISIONING_ERROR:
      return "provisioning";
    case REGISTRATION_FAILURE_CATEGORIES.DATABASE_ERROR:
    case REGISTRATION_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR:
    default:
      return "service";
  }
}

export function createRegistrationFailureLog({
  category,
  error,
  source,
  requestId,
  occurredAt,
  event = "auth.registration.failed",
}) {
  const providerErrorStatus = normalizeProviderErrorStatus(error);
  const timestamp = normalizeOccurredAt(occurredAt);

  return {
    timestamp,
    event: safeLogToken(event) ?? "auth.registration.failed",
    category,
    source: safeLogToken(source) ?? "unknown",
    requestId: safeLogToken(requestId, 128),
    providerErrorCode: safeLogToken(errorStringField(error, "code")),
    providerErrorName: safeLogToken(errorStringField(error, "name")),
    providerErrorStatus,
  };
}

async function logSafely(logFailure, category, error, source, event) {
  try {
    await logFailure({ category, error, source, event });
  } catch {
    // Logging should not turn a useful registration response into a failed request.
  }
}

async function fail(logFailure, category, error, source) {
  await logSafely(logFailure, category, error, source);
  return "/register?error=" + getRegistrationErrorQueryCode(category);
}

export async function executeRegistration({
  fullName,
  email,
  phone,
  agentCode,
  managerCode,
  password,
  createAuthClient,
  createAdminClient,
  logFailure,
}) {
  const validationPath = validateRegistrationInput({
    fullName,
    email,
    phone,
    agentCode,
    managerCode,
    password,
  });
  if (validationPath) return validationPath;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();
  const normalizedAgentCode = agentCode.trim();
  const normalizedManagerCode = managerCode.trim();

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return fail(
      logFailure,
      REGISTRATION_FAILURE_CATEGORIES.DATABASE_ERROR,
      error,
      "database-config",
    );
  }

  let managerCheck;
  try {
    managerCheck = await admin.findEligibleManagerByAgentCode(normalizedManagerCode);
  } catch (error) {
    return fail(logFailure, REGISTRATION_FAILURE_CATEGORIES.DATABASE_ERROR, error, "manager-code-precheck");
  }
  if (managerCheck?.error) {
    return fail(logFailure, REGISTRATION_FAILURE_CATEGORIES.DATABASE_ERROR, managerCheck.error, "manager-code-precheck");
  }
  if (!managerCheck?.eligible) {
    return fail(logFailure, REGISTRATION_FAILURE_CATEGORIES.INVALID_MANAGER, undefined, "manager-code-precheck");
  }
  const identifierChecks = [
    {
      check: () => admin.findExistingPhone(normalizedPhone),
      duplicateCategory: REGISTRATION_FAILURE_CATEGORIES.PHONE_IN_USE,
      source: "phone-precheck",
    },
    {
      check: () => admin.findExistingAgentCode(normalizedAgentCode),
      duplicateCategory: REGISTRATION_FAILURE_CATEGORIES.AGENT_CODE_IN_USE,
      source: "agent-code-precheck",
    },
  ];

  for (const item of identifierChecks) {
    let result;
    try {
      result = await item.check();
    } catch (error) {
      return fail(
        logFailure,
        REGISTRATION_FAILURE_CATEGORIES.DATABASE_ERROR,
        error,
        "database",
      );
    }

    if (result?.error) {
      return fail(
        logFailure,
        REGISTRATION_FAILURE_CATEGORIES.DATABASE_ERROR,
        result.error,
        "database",
      );
    }

    if (result?.exists) {
      return fail(logFailure, item.duplicateCategory, undefined, item.source);
    }
  }

  let authClient;
  try {
    authClient = await createAuthClient();
  } catch (error) {
    return fail(
      logFailure,
      REGISTRATION_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR,
      error,
      "supabase-config",
    );
  }

  let result;
  try {
    result = await authClient.signUp({
      email: normalizedEmail,
      password,
      metadata: {
        registration_type: "SA_SELF_REGISTRATION",
        ho_ten: fullName.trim(),
        so_dien_thoai: normalizedPhone,
        ma_dai_ly: normalizedAgentCode,
        manager_code: normalizedManagerCode,
      },
    });
  } catch (error) {
    const category = classifyRegistrationAuthError(error);
    return fail(logFailure, category, error, "supabase-auth");
  }

  if (result?.error) {
    const category = classifyRegistrationAuthError(result.error);
    return fail(logFailure, category, result.error, "supabase-auth");
  }

  if (!result?.user) {
    return fail(
      logFailure,
      REGISTRATION_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR,
      undefined,
      "supabase-auth",
    );
  }

  // When email confirmation is enabled, Supabase may return a fake user with
  // no identities for an existing address. Do not report a successful signup.
  if (result.user.identityCount === 0) {
    return fail(
      logFailure,
      REGISTRATION_FAILURE_CATEGORIES.EMAIL_UNAVAILABLE,
      { code: "user_already_exists", status: 400, name: "AuthApiError" },
      "supabase-auth",
    );
  }

  // Hosted Supabase defaults to email confirmation ON, while local config here
  // intentionally disables it. Support both modes instead of falsely saying
  // registration failed when Auth accepted the user but returned no session.
  if (!result.hasSession) {
    return "/register?status=verify-email";
  }

  try {
    const cleanup = await authClient.signOutLocal();
    if (cleanup?.error) {
      await logSafely(
        logFailure,
        REGISTRATION_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR,
        cleanup.error,
        "session-cleanup",
        "auth.registration.session_cleanup_failed",
      );
    }
  } catch (error) {
    await logSafely(
      logFailure,
      REGISTRATION_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR,
      error,
      "session-cleanup",
      "auth.registration.session_cleanup_failed",
    );
  }

  return "/login?status=registered";
}
