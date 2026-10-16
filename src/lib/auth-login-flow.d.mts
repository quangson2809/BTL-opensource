import type { LoginFailureCategory } from "./auth-login-errors.mjs";

type AuthFlowClient = {
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<{
    data: { user: { id: string } | null } | null;
    error: unknown | null;
  }>;
  signOutLocal(): Promise<{ error?: unknown | null } | void>;
};

type AccountFlowClient = {
  getAccount(userId: string): Promise<{
    data: { id: string; trang_thai: string } | null;
    error: unknown | null;
  }>;
};

export function executeLogin(input: {
  email: string;
  password: string;
  createAuthClient: () => AuthFlowClient | Promise<AuthFlowClient>;
  createAdminClient: () => AccountFlowClient;
  logFailure: (
    category: LoginFailureCategory,
    error?: unknown,
    source?: string,
  ) => void | Promise<void>;
}): Promise<string>;
