import assert from "node:assert/strict";
import { test } from "node:test";

import { executeLogin } from "../src/lib/auth-login-flow.mjs";
import {
  LOGIN_ERROR_MESSAGES,
  LOGIN_FAILURE_CATEGORIES as CATEGORY,
  TEMPORARY_LOCK_HOOK_MESSAGE,
} from "../src/lib/auth-login-errors.mjs";

function fixture({
  authResult = { data: { user: { id: "user-1" } }, error: null },
  thrownAuthError,
  authClientError,
  account = { id: "user-1", trang_thai: "DANG_HOAT_DONG" },
  accountError = null,
  thrownDatabaseError,
  signOutError = null,
} = {}) {
  const calls = { signIn: [], signOut: [], query: [], logs: [] };
  const supabase = {
    auth: {
      async signInWithPassword(input) {
        calls.signIn.push(input);
        if (thrownAuthError) throw thrownAuthError;
        return authResult;
      },
      async signOut(input) {
        calls.signOut.push(input);
        return { error: signOutError };
      },
    },
  };
  const admin = {
    from(table) {
      calls.query.push({ table });
      return {
        select(columns) {
          calls.query.push({ columns });
          return {
            eq(column, value) {
              calls.query.push({ column, value });
              return {
                async maybeSingle() {
                  if (thrownDatabaseError) throw thrownDatabaseError;
                  return { data: account, error: accountError };
                },
              };
            },
          };
        },
      };
    },
  };

  return {
    calls,
    run: (overrides = {}) => executeLogin({
      email: "sa@example.test",
      password: "not-logged-or-returned",
      createAuthClient: async () => {
        if (authClientError) throw authClientError;
        return supabase;
      },
      createAdminClient: () => admin,
      logFailure: async (...args) => calls.logs.push(args),
      ...overrides,
    }),
  };
}

test("wrong password and unknown email use the same public error and message", async () => {
  const error = {
    name: "AuthApiError",
    status: 400,
    code: "invalid_credentials",
    message: "Invalid login credentials",
  };
  const wrongPassword = fixture({ authResult: { data: { user: null }, error } });
  const unknownEmail = fixture({ authResult: { data: { user: null }, error: { ...error } } });

  const [wrongPasswordPath, unknownEmailPath] = await Promise.all([
    wrongPassword.run(),
    unknownEmail.run({ email: "unknown@example.test" }),
  ]);

  assert.equal(wrongPasswordPath, "/login?error=invalid");
  assert.equal(unknownEmailPath, wrongPasswordPath);
  assert.equal(LOGIN_ERROR_MESSAGES.invalid, "Email hoặc mật khẩu không hợp lệ.");
  assert.equal(wrongPassword.calls.logs[0][0], CATEGORY.INVALID_CREDENTIALS);
  assert.equal(unknownEmail.calls.logs[0][0], CATEGORY.INVALID_CREDENTIALS);
});

test("pending account gets its fixed message and local session is cleared", async () => {
  const state = fixture({ account: { id: "user-1", trang_thai: "CHO_PHE_DUYET" } });
  assert.equal(await state.run(), "/login?error=pending");
  assert.deepEqual(state.calls.signOut, [{ scope: "local" }]);
  assert.equal(state.calls.logs.at(-1)[0], CATEGORY.ACCOUNT_PENDING);
  assert.equal(LOGIN_ERROR_MESSAGES.pending, "Tài khoản đang chờ quản trị viên phê duyệt.");
});

test("administratively locked account gets its fixed message and local session is cleared", async () => {
  const state = fixture({ account: { id: "user-1", trang_thai: "KHOA" } });
  assert.equal(await state.run(), "/login?error=locked");
  assert.deepEqual(state.calls.signOut, [{ scope: "local" }]);
  assert.equal(state.calls.logs.at(-1)[0], CATEGORY.ACCOUNT_LOCKED);
  assert.equal(LOGIN_ERROR_MESSAGES.locked, "Tài khoản đã bị quản trị viên khóa.");
});

test("temporary-lock response returned by Auth is distinct from invalid credentials", async () => {
  const state = fixture({
    authResult: {
      data: { user: null },
      error: { name: "AuthApiError", status: 400, code: "hook_rejected", message: TEMPORARY_LOCK_HOOK_MESSAGE },
    },
  });
  assert.equal(await state.run(), "/login?error=temporary-lock");
  assert.equal(state.calls.logs.at(-1)[0], CATEGORY.TEMPORARY_LOCK);
  assert.equal(LOGIN_ERROR_MESSAGES["temporary-lock"], "Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau.");
});

test("temporary-lock response thrown by Auth keeps its classification", async () => {
  const state = fixture({ thrownAuthError: new Error(TEMPORARY_LOCK_HOOK_MESSAGE) });
  assert.equal(await state.run(), "/login?error=temporary-lock");
  assert.equal(state.calls.logs.at(-1)[0], CATEGORY.TEMPORARY_LOCK);
});

test("Auth configuration and rejected service calls produce a safe generic message", async () => {
  const configError = fixture({ authClientError: new Error("private config detail") });
  assert.equal(await configError.run(), "/login?error=service");
  assert.equal(configError.calls.logs.at(-1)[0], CATEGORY.AUTH_SERVICE_ERROR);
  assert.equal(configError.calls.logs.at(-1)[2], "supabase-config");

  const serviceError = fixture({ thrownAuthError: new Error("private provider detail") });
  assert.equal(await serviceError.run(), "/login?error=service");
  assert.equal(serviceError.calls.logs.at(-1)[0], CATEGORY.AUTH_SERVICE_ERROR);
  assert.equal(LOGIN_ERROR_MESSAGES.service, "Không thể đăng nhập lúc này. Vui lòng thử lại sau.");
});

test("database query error signs the new session out and logs the database source", async () => {
  const state = fixture({
    accountError: { code: "PGRST000", message: "private database detail" },
  });
  assert.equal(await state.run(), "/login?error=service");
  assert.deepEqual(state.calls.signOut, [{ scope: "local" }]);
  assert.ok(state.calls.logs.some((entry) => entry[0] === CATEGORY.AUTH_SERVICE_ERROR && entry[2] === "database"));
  assert.equal(LOGIN_ERROR_MESSAGES.service, "Không thể đăng nhập lúc này. Vui lòng thử lại sau.");
});

test("database exception also clears the session and returns the service message", async () => {
  const state = fixture({ thrownDatabaseError: new Error("private SQL detail") });
  assert.equal(await state.run(), "/login?error=service");
  assert.deepEqual(state.calls.signOut, [{ scope: "local" }]);
  assert.ok(state.calls.logs.some((entry) => entry[0] === CATEGORY.AUTH_SERVICE_ERROR && entry[2] === "database"));
});

test("missing business account does not retain the Auth session", async () => {
  const state = fixture({ account: null });
  assert.equal(await state.run(), "/login?error=access");
  assert.deepEqual(state.calls.signOut, [{ scope: "local" }]);
});

test("active account reaches dashboard and the RLS checks remain downstream", async () => {
  const state = fixture();
  assert.equal(await state.run(), "/dashboard");
  assert.deepEqual(state.calls.signOut, []);
  assert.deepEqual(state.calls.query.slice(0, 3), [
    { table: "tai_khoan" },
    { columns: "id,trang_thai" },
    { column: "id", value: "user-1" },
  ]);
});
