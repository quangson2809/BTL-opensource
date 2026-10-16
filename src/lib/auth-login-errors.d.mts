export type LoginFailureCategory =
  | "INVALID_CREDENTIALS"
  | "TEMPORARY_LOCK"
  | "EMAIL_NOT_CONFIRMED"
  | "RATE_LIMITED"
  | "AUTH_SERVICE_ERROR"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_PENDING"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_STATE_REJECTED";

export const LOGIN_FAILURE_CATEGORIES: Readonly<{
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
  TEMPORARY_LOCK: "TEMPORARY_LOCK";
  EMAIL_NOT_CONFIRMED: "EMAIL_NOT_CONFIRMED";
  RATE_LIMITED: "RATE_LIMITED";
  AUTH_SERVICE_ERROR: "AUTH_SERVICE_ERROR";
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND";
  ACCOUNT_PENDING: "ACCOUNT_PENDING";
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
  ACCOUNT_STATE_REJECTED: "ACCOUNT_STATE_REJECTED";
}>;

export const TEMPORARY_LOCK_HOOK_MESSAGE: string;

export function classifyLoginAuthError(error: unknown): LoginFailureCategory;
export function getLoginErrorQueryCode(category: LoginFailureCategory): string;

export type LoginFailureLogEntry = {
  timestamp: string;
  event: "auth.login.failed";
  category: LoginFailureCategory;
  source: string;
  requestId: string | null;
  providerErrorCode: string | null;
  providerErrorName: string | null;
  providerErrorStatus: number | null;
};

export function createLoginFailureLog(input: {
  category: LoginFailureCategory;
  error?: unknown;
  requestId?: string | null;
  source?: string;
  occurredAt?: string;
}): LoginFailureLogEntry;
