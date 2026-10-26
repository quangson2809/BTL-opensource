import {
  asRecord,
  errorStringField,
  normalizeOccurredAt,
  normalizeProviderErrorStatus,
  safeLogToken,
} from "./safe-error-logging.mjs";

export const LOGIN_FAILURE_CATEGORIES = Object.freeze({
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TEMPORARY_LOCK: "TEMPORARY_LOCK",
  EMAIL_NOT_CONFIRMED: "EMAIL_NOT_CONFIRMED",
  RATE_LIMITED: "RATE_LIMITED",
  AUTH_SERVICE_ERROR: "AUTH_SERVICE_ERROR",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  ACCOUNT_PENDING: "ACCOUNT_PENDING",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_STATE_REJECTED: "ACCOUNT_STATE_REJECTED",
});

export const LOGIN_ERROR_MESSAGES = Object.freeze({
  missing: "Vui lòng nhập email và mật khẩu.",
  invalid: "Email hoặc mật khẩu không hợp lệ.",
  pending: "Tài khoản đang chờ quản trị viên phê duyệt.",
  locked: "Tài khoản đã bị quản trị viên khóa.",
  "temporary-lock": "Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau.",
  "rate-limited": "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ rồi thử lại.",
  service: "Không thể đăng nhập lúc này. Vui lòng thử lại sau.",
  access: "Không thể cấp quyền truy cập cho tài khoản này.",
});

// Owned by the password-verification hook in
// supabase/migrations/20261002090000_auth_session_foundation.sql.
// The integration test verifies this exact signal against the real local Auth stack.
export const TEMPORARY_LOCK_HOOK_MESSAGE =
  "Account temporarily locked. Try again later.";

const INVALID_CREDENTIAL_CODES = new Set([
  "invalid_credentials",
  "email_address_invalid",
  "email_address_not_provided",
  "user_not_found",
]);
const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_request_rate_limit_exceeded",
  "rate_limit_exceeded",
  "too_many_requests",
]);

export function classifyLoginAuthError(error) {
  const value = asRecord(error);
  if (!value) return LOGIN_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR;

  // This exact message is emitted by our own Postgres password-verification
  // hook when a valid password is rejected by an active temporary lock.
  // It is intentionally tested against the deployed local Auth stack.
  if (value.message === TEMPORARY_LOCK_HOOK_MESSAGE) {
    return LOGIN_FAILURE_CATEGORIES.TEMPORARY_LOCK;
  }

  const code = typeof value.code === "string" ? value.code.toLowerCase() : "";
  if (code === "email_not_confirmed") {
    return LOGIN_FAILURE_CATEGORIES.EMAIL_NOT_CONFIRMED;
  }
  if (
    INVALID_CREDENTIAL_CODES.has(code) ||
    value.name === "AuthInvalidCredentialsError"
  ) {
    return LOGIN_FAILURE_CATEGORIES.INVALID_CREDENTIALS;
  }
  if (RATE_LIMIT_CODES.has(code) || value.status === 429) {
    return LOGIN_FAILURE_CATEGORIES.RATE_LIMITED;
  }

  return LOGIN_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR;
}

export function getLoginErrorQueryCode(category) {
  switch (category) {
    case LOGIN_FAILURE_CATEGORIES.TEMPORARY_LOCK:
      return "temporary-lock";
    case LOGIN_FAILURE_CATEGORIES.RATE_LIMITED:
      return "rate-limited";
    case LOGIN_FAILURE_CATEGORIES.AUTH_SERVICE_ERROR:
      return "service";
    case LOGIN_FAILURE_CATEGORIES.ACCOUNT_NOT_FOUND:
    case LOGIN_FAILURE_CATEGORIES.ACCOUNT_STATE_REJECTED:
      return "access";
    case LOGIN_FAILURE_CATEGORIES.ACCOUNT_PENDING:
      return "pending";
    case LOGIN_FAILURE_CATEGORIES.ACCOUNT_LOCKED:
      return "locked";
    // Keep invalid credentials and unconfirmed email on the same public response
    // to avoid exposing whether an email has an Auth identity. Email confirmation
    // is disabled in the repository's chosen registration policy.
    case LOGIN_FAILURE_CATEGORIES.EMAIL_NOT_CONFIRMED:
    case LOGIN_FAILURE_CATEGORIES.INVALID_CREDENTIALS:
    default:
      return "invalid";
  }
}

export function createLoginFailureLog({
  category,
  error,
  requestId,
  source = "supabase-auth",
  occurredAt,
}) {
  const providerErrorStatus = normalizeProviderErrorStatus(error);
  const timestamp = normalizeOccurredAt(occurredAt);

  return {
    timestamp,
    event: "auth.login.failed",
    category,
    source: safeLogToken(source) ?? "unknown",
    requestId: safeLogToken(requestId, 128),
    providerErrorCode: safeLogToken(errorStringField(error, "code")),
    providerErrorName: safeLogToken(errorStringField(error, "name")),
    providerErrorStatus,
  };
}
