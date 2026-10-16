import type { LoginFailureCategory } from "./auth-login-errors.mjs";

type AuthClient = {
  auth: {
    signInWithPassword(input: {
      email: string;
      password: string;
    }): Promise<{
      data: { user: { id: string } | null } | null;
      error: unknown | null;
    }>;
    signOut(input: { scope: "local" }): Promise<{ error?: unknown | null } | void>;
  };
};

type AdminClient = {
  from(table: "tai_khoan"): {
    select(columns: "id,trang_thai"): {
      eq(column: "id", value: string): {
        maybeSingle(): Promise<{
          data: { id: string; trang_thai: string } | null;
          error: unknown | null;
        }>;
      };
    };
  };
};

export function executeLogin(input: {
  email: string;
  password: string;
  createAuthClient: () => AuthClient | Promise<AuthClient>;
  createAdminClient: () => AdminClient;
  logFailure: (
    category: LoginFailureCategory,
    error?: unknown,
    source?: string,
  ) => void | Promise<void>;
}): Promise<string>;
