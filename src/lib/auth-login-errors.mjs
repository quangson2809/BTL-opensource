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

function asRecord(value) {
  return value !== null && typeof value === "object" ? value : null;
}

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

function safeLogToken(value, maxLength = 96) {
  if (typeof value !== "string") return null;
  const token = value.trim();
  if (
    token.length === 0 ||
    token.length > maxLength ||
    !/^[A-Za-z0-9._:-]+$/.test(token)
  ) {
    return null;
  }
  return token;
}

function errorField(error, key) {
  const value = asRecord(error)?.[key];
  return typeof value === "string" ? value : null;
}

export function createLoginFailureLog({
  category,
  error,
  requestId,
  source = "supabase-auth",
  occurredAt,
}) {
  const status = asRecord(error)?.status;
  const providerErrorStatus =
    Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;

  const timestamp =
    typeof occurredAt === "string" && !Number.isNaN(Date.parse(occurredAt))
      ? occurredAt
      : new Date().toISOString();

  return {
    timestamp,
    event: "auth.login.failed",
    category,
    source: safeLogToken(source) ?? "unknown",
    requestId: safeLogToken(requestId, 128),
    providerErrorCode: safeLogToken(errorField(error, "code")),
    providerErrorName: safeLogToken(errorField(error, "name")),
    providerErrorStatus,
  };
}
