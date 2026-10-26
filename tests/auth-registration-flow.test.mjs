import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyRegistrationAuthError,
  createRegistrationFailureLog,
  executeRegistration,
  getRegistrationErrorQueryCode,
  REGISTRATION_ERROR_MESSAGES,
  REGISTRATION_FAILURE_CATEGORIES as CATEGORY,
  REGISTRATION_STATUS_MESSAGES,
  validateRegistrationInput,
} from "../src/lib/auth-registration.mjs";

const validInput = {
  fullName: "Test Agent",
  email: "Test.Agent@example.test",
  phone: "0901234567",
  agentCode: "SA-TEST-001",
  managerCode: "DM-TEST-001",
  password: "Phase2Integration1",
};

function fixture({
  phoneExists = false,
  agentCodeExists = false,
  phoneCheckError = null,
  agentCodeCheckError = null,
  managerEligible = true,
  managerCheckError = null,
  adminCreateError,
  authCreateError,
  signUpResult = {
    user: { id: "user-1", identityCount: 1 },
    hasSession: true,
    error: null,
  },
  signUpError,
  thrownSignUpError,
  signOutError = null,
  thrownSignOutError,
  logError = false,
} = {}) {
  const calls = { phoneChecks: [], agentChecks: [], managerChecks: [], signUps: [], signOuts: 0, logs: [] };
  const admin = {
    async findExistingPhone(phone) {
      calls.phoneChecks.push(phone);
      if (phoneCheckError) return { exists: false, error: phoneCheckError };
      return { exists: phoneExists, error: null };
    },
    async findExistingAgentCode(code) {
      calls.agentChecks.push(code);
      if (agentCodeCheckError) return { exists: false, error: agentCodeCheckError };
      return { exists: agentCodeExists, error: null };
    },
    async findEligibleManagerByAgentCode(code) {
      calls.managerChecks.push(code);
      if (managerCheckError) return { eligible: false, error: managerCheckError };
      return { eligible: managerEligible, error: null };
    },
  };
  const auth = {
    async signUp(input) {
      calls.signUps.push(input);
      if (thrownSignUpError) throw thrownSignUpError;
      if (signUpError) return { user: null, hasSession: false, error: signUpError };
      return signUpResult;
    },
    async signOutLocal() {
      calls.signOuts += 1;
      if (thrownSignOutError) throw thrownSignOutError;
      return { error: signOutError };
    },
  };

  return {
    calls,
    run: (overrides = {}) => executeRegistration({
      ...validInput,
      createAdminClient: () => {
        if (adminCreateError) throw adminCreateError;
        return admin;
      },
      createAuthClient: async () => {
        if (authCreateError) throw authCreateError;
        return auth;
      },
      logFailure: async (entry) => {
        calls.logs.push(entry);
        if (logError) throw new Error("logging unavailable");
      },
      ...overrides,
    }),
  };
}

test("registration validates required fields, email, phone format, and password before touching services", async () => {
  assert.equal(validateRegistrationInput({ ...validInput, phone: "" }), "/register?error=missing");
  assert.equal(validateRegistrationInput({ ...validInput, managerCode: "" }), "/register?error=missing");
  assert.equal(validateRegistrationInput({ ...validInput, email: "bad-email" }), "/register?error=invalid-email");
  assert.equal(validateRegistrationInput({ ...validInput, phone: "1234567890" }), "/register?error=invalid-phone");
  assert.equal(validateRegistrationInput({ ...validInput, phone: "090123456" }), "/register?error=invalid-phone");
  assert.equal(validateRegistrationInput({ ...validInput, phone: "09012345678" }), "/register?error=invalid-phone");
  assert.equal(validateRegistrationInput({ ...validInput, phone: "+84901234567" }), "/register?error=invalid-phone");
  for (const phone of ["0312345678", "0512345678", "0712345678", "0812345678", "0912345678"]) {
    assert.equal(validateRegistrationInput({ ...validInput, phone }), null);
  }
  assert.equal(validateRegistrationInput({ ...validInput, password: "short" }), "/register?error=weak-password");

  const missing = fixture();
  assert.equal(await missing.run({ phone: "" }), "/register?error=missing");
  assert.equal(missing.calls.phoneChecks.length, 0);
  assert.equal(missing.calls.signUps.length, 0);

  const invalidPhone = fixture();
  assert.equal(await invalidPhone.run({ phone: "1234567890" }), "/register?error=invalid-phone");
  assert.equal(invalidPhone.calls.phoneChecks.length, 0);
  assert.equal(invalidPhone.calls.signUps.length, 0);
});

test("invalid manager is rejected before Auth signup", async () => {
  const state = fixture({ managerEligible: false });
  assert.equal(await state.run(), "/register?error=invalid-manager");
  assert.equal(state.calls.signUps.length, 0);
  assert.equal(state.calls.logs[0].category, CATEGORY.INVALID_MANAGER);
});

test("manager lookup errors fail closed", async () => {
  const state = fixture({ managerCheckError: { code: "PGRST000", status: 503 } });
  assert.equal(await state.run(), "/register?error=service");
  assert.equal(state.calls.signUps.length, 0);
  assert.equal(state.calls.logs[0].category, CATEGORY.DATABASE_ERROR);
});

test("existing phone number returns a specific message without calling Auth signup", async () => {
  const state = fixture({ phoneExists: true });
  assert.equal(await state.run(), "/register?error=phone-in-use");
  assert.equal(state.calls.signUps.length, 0);
  assert.equal(state.calls.logs[0].category, CATEGORY.PHONE_IN_USE);
  assert.equal(REGISTRATION_ERROR_MESSAGES["phone-in-use"], "Số điện thoại này đã được sử dụng. Vui lòng kiểm tra lại.");
});

test("existing agent code returns a specific message without calling Auth signup", async () => {
  const state = fixture({ agentCodeExists: true });
  assert.equal(await state.run(), "/register?error=agent-code-in-use");
  assert.equal(state.calls.signUps.length, 0);
  assert.equal(state.calls.logs[0].category, CATEGORY.AGENT_CODE_IN_USE);
});

test("database precheck errors are logged and return a service response", async () => {
  const state = fixture({ phoneCheckError: { code: "PGRST000", status: 503, message: "private database detail" } });
  assert.equal(await state.run(), "/register?error=service");
  assert.equal(state.calls.logs[0].category, CATEGORY.DATABASE_ERROR);
  assert.equal(state.calls.logs[0].source, "database");
});

test("missing service configuration returns a safe service response", async () => {
  const state = fixture({ adminCreateError: new Error("missing secret detail") });
  assert.equal(await state.run(), "/register?error=service");
  assert.equal(state.calls.logs[0].source, "database-config");

  const authState = fixture({ authCreateError: new Error("missing public config detail") });
  assert.equal(await authState.run(), "/register?error=service");
  assert.equal(authState.calls.logs[0].source, "supabase-config");
});

test("email, weak password, and rate-limit Auth errors have dedicated mappings", async () => {
  assert.equal(classifyRegistrationAuthError({ code: "email_address_invalid", status: 400 }), CATEGORY.INVALID_EMAIL);
  assert.equal(classifyRegistrationAuthError({ code: "weak_password", status: 422 }), CATEGORY.WEAK_PASSWORD);
  assert.equal(classifyRegistrationAuthError({ code: "over_email_send_rate_limit", status: 429 }), CATEGORY.RATE_LIMITED);
  assert.equal(getRegistrationErrorQueryCode(CATEGORY.EMAIL_UNAVAILABLE), "email-unavailable");

  const state = fixture({ signUpError: { code: "weak_password", status: 422, name: "AuthApiError", message: "weak password private detail" } });
  assert.equal(await state.run(), "/register?error=weak-password");
  assert.equal(state.calls.logs[0].category, CATEGORY.WEAK_PASSWORD);
  assert.equal(REGISTRATION_ERROR_MESSAGES["weak-password"], "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ thường, chữ hoa và số.");
});

test("email already in use is handled without exposing provider text", async () => {
  const state = fixture({ signUpError: { code: "email_exists", status: 422, name: "AuthApiError", message: "User already registered" } });
  assert.equal(await state.run(), "/register?error=email-unavailable");
  assert.equal(state.calls.logs[0].category, CATEGORY.EMAIL_UNAVAILABLE);
  assert.match(REGISTRATION_ERROR_MESSAGES["email-unavailable"], /đăng nhập|Quên mật khẩu/);
  assert.doesNotMatch(REGISTRATION_ERROR_MESSAGES["email-unavailable"], /đã tồn tại/i);
});

test("Auth trigger provisioning errors are categorized without showing raw SQL", async () => {
  const error = { code: "unexpected_failure", status: 500, name: "AuthApiError", message: "Database error saving new user: duplicate key owner@example.test" };
  const state = fixture({ signUpError: error });
  assert.equal(await state.run(), "/register?error=provisioning");
  assert.equal(state.calls.logs[0].category, CATEGORY.PROVISIONING_ERROR);
  assert.equal(REGISTRATION_ERROR_MESSAGES.provisioning.includes("duplicate key"), false);
});

test("Auth exception is handled as service error and does not leak its message", async () => {
  const state = fixture({ thrownSignUpError: new Error("private network detail") });
  assert.equal(await state.run(), "/register?error=service");
  assert.equal(state.calls.logs[0].category, CATEGORY.AUTH_SERVICE_ERROR);
  assert.equal(REGISTRATION_ERROR_MESSAGES.service.includes("private network detail"), false);
});

test("confirmation-required signup is reported as accepted, not failed", async () => {
  const state = fixture({ signUpResult: { user: { id: "user-1", identityCount: 1 }, hasSession: false, error: null } });
  assert.equal(await state.run(), "/register?status=verify-email");
  assert.equal(state.calls.signOuts, 0);
  assert.match(REGISTRATION_STATUS_MESSAGES["verify-email"], /xác minh email/);
});

test("email-confirmation-mode obfuscated user gets the safe email-unavailable response", async () => {
  const state = fixture({ signUpResult: { user: { id: "obfuscated", identityCount: 0 }, hasSession: false, error: null } });
  assert.equal(await state.run(), "/register?error=email-unavailable");
  assert.equal(state.calls.logs[0].category, CATEGORY.EMAIL_UNAVAILABLE);
});

test("successful auto-confirm signup clears the local session and shows approval pending", async () => {
  const state = fixture();
  assert.equal(await state.run(), "/login?status=registered");
  assert.equal(state.calls.signOuts, 1);
  assert.equal(state.calls.signUps[0].email, "test.agent@example.test");
  assert.equal(state.calls.signUps[0].metadata.registration_type, "SA_SELF_REGISTRATION");
  assert.equal(state.calls.signUps[0].metadata.manager_code, validInput.managerCode);
  assert.equal(state.calls.phoneChecks[0], validInput.phone);
  assert.equal(state.calls.agentChecks[0], validInput.agentCode);
});

test("sign-out failure does not falsely report signup failure and is logged separately", async () => {
  const state = fixture({ signOutError: { code: "session_error", status: 500, name: "AuthApiError" } });
  assert.equal(await state.run(), "/login?status=registered");
  assert.equal(state.calls.logs[0].event, "auth.registration.session_cleanup_failed");
});

test("registration logs contain safe technical metadata only", () => {
  const log = createRegistrationFailureLog({
    category: CATEGORY.PROVISIONING_ERROR,
    source: "supabase-auth",
    requestId: "req-123:region-a",
    occurredAt: "2026-10-16T14:00:00.000Z",
    error: {
      code: "unexpected_failure",
      name: "AuthApiError",
      status: 500,
      message: "Database error for owner@example.com and password=never-log",
    },
  });

  assert.deepEqual(log, {
    timestamp: "2026-10-16T14:00:00.000Z",
    event: "auth.registration.failed",
    category: "PROVISIONING_ERROR",
    source: "supabase-auth",
    requestId: "req-123:region-a",
    providerErrorCode: "unexpected_failure",
    providerErrorName: "AuthApiError",
    providerErrorStatus: 500,
  });
  assert.doesNotMatch(JSON.stringify(log), /owner@example\.com|never-log|password|message/i);
});

test("registration still returns the correct error if structured logging fails", async () => {
  const state = fixture({ phoneExists: true, logError: true });
  assert.equal(await state.run(), "/register?error=phone-in-use");
});
