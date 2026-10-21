export type RegistrationFailureCategory =
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "EMAIL_UNAVAILABLE"
  | "PHONE_IN_USE"
  | "AGENT_CODE_IN_USE"
  | "INVALID_MANAGER"
  | "RATE_LIMITED"
  | "DATABASE_ERROR"
  | "PROVISIONING_ERROR"
  | "AUTH_SERVICE_ERROR";

export const REGISTRATION_FAILURE_CATEGORIES: Readonly<{
  INVALID_EMAIL: "INVALID_EMAIL";
  WEAK_PASSWORD: "WEAK_PASSWORD";
  EMAIL_UNAVAILABLE: "EMAIL_UNAVAILABLE";
  PHONE_IN_USE: "PHONE_IN_USE";
  AGENT_CODE_IN_USE: "AGENT_CODE_IN_USE";
  INVALID_MANAGER: "INVALID_MANAGER";
  RATE_LIMITED: "RATE_LIMITED";
  DATABASE_ERROR: "DATABASE_ERROR";
  PROVISIONING_ERROR: "PROVISIONING_ERROR";
  AUTH_SERVICE_ERROR: "AUTH_SERVICE_ERROR";
}>;

export const REGISTRATION_ERROR_MESSAGES: Readonly<Record<string, string>>;
export const REGISTRATION_STATUS_MESSAGES: Readonly<Record<string, string>>;

export function validateRegistrationInput(input: {
  fullName: string;
  email: string;
  phone: string;
  agentCode: string;
  managerCode: string;
  password: string;
}): string | null;

export function classifyRegistrationAuthError(error: unknown): RegistrationFailureCategory;
export function getRegistrationErrorQueryCode(category: RegistrationFailureCategory): string;

export type RegistrationFailureLogEntry = {
  timestamp: string;
  event: string;
  category: RegistrationFailureCategory;
  source: string;
  requestId: string | null;
  providerErrorCode: string | null;
  providerErrorName: string | null;
  providerErrorStatus: number | null;
};

export function createRegistrationFailureLog(input: {
  category: RegistrationFailureCategory;
  error?: unknown;
  source?: string;
  requestId?: string | null;
  occurredAt?: string;
  event?: string;
}): RegistrationFailureLogEntry;

type RegistrationAuthClient = {
  signUp(input: {
    email: string;
    password: string;
    metadata: {
      registration_type: "SA_SELF_REGISTRATION";
      ho_ten: string;
      so_dien_thoai: string;
      ma_dai_ly: string;
      manager_code: string;
    };
  }): Promise<{
    user: { id: string; identityCount: number | null } | null;
    hasSession: boolean;
    error: unknown | null;
  }>;
  signOutLocal(): Promise<{ error: unknown | null } | void>;
};

type RegistrationAdminClient = {
  findExistingPhone(phone: string): Promise<{ exists: boolean; error: unknown | null }>;
  findExistingAgentCode(code: string): Promise<{ exists: boolean; error: unknown | null }>;
  findEligibleManagerByAgentCode(code: string): Promise<{ eligible: boolean; error: unknown | null }>;
};

export function executeRegistration(input: {
  fullName: string;
  email: string;
  phone: string;
  agentCode: string;
  managerCode: string;
  password: string;
  createAuthClient: () => RegistrationAuthClient | Promise<RegistrationAuthClient>;
  createAdminClient: () => RegistrationAdminClient;
  logFailure: (input: {
    category: RegistrationFailureCategory;
    error?: unknown;
    source: string;
    event?: string;
  }) => void | Promise<void>;
}): Promise<string>;
