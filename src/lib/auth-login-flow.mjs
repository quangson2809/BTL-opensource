import {
  classifyLoginAuthError,
  getLoginErrorQueryCode,
  LOGIN_FAILURE_CATEGORIES as CATEGORY,
} from "./auth-login-errors.mjs";

function redirectForCategory(category) {
  return "/login?error=" + getLoginErrorQueryCode(category);
}

async function logSafely(logFailure, category, error, source) {
  try {
    await logFailure(category, error, source);
  } catch {
    // Diagnostics must never change the user's authentication outcome.
  }
}

async function rejectAuthenticatedUser({ supabase, category, error, source, logFailure }) {
  try {
    const result = await supabase.auth.signOut({ scope: "local" });
    if (result && result.error) {
      await logSafely(
        logFailure,
        CATEGORY.AUTH_SERVICE_ERROR,
        result.error,
        "session-cleanup",
      );
    }
  } catch (cleanupError) {
    await logSafely(
      logFailure,
      CATEGORY.AUTH_SERVICE_ERROR,
      cleanupError,
      "session-cleanup",
    );
  }

  await logSafely(logFailure, category, error, source);
  return redirectForCategory(category);
}

/**
 * Runs the login decision flow without coupling it to Next.js redirect errors.
 * Injected clients make all authentication branches independently testable.
 */
export async function executeLogin({
  email,
  password,
  createAuthClient,
  createAdminClient,
  logFailure,
}) {
  let supabase;
  try {
    supabase = await createAuthClient();
  } catch (error) {
    await logSafely(logFailure, CATEGORY.AUTH_SERVICE_ERROR, error, "supabase-config");
    return redirectForCategory(CATEGORY.AUTH_SERVICE_ERROR);
  }

  let authResult;
  try {
    authResult = await supabase.auth.signInWithPassword({ email, password });
  } catch (error) {
    // Supabase errors can be returned or thrown. Classify both paths identically
    // so a thrown password-hook rejection is not mislabeled as service failure.
    const category = classifyLoginAuthError(error);
    await logSafely(logFailure, category, error, "supabase-auth");
    return redirectForCategory(category);
  }

  const user = authResult && authResult.data && authResult.data.user;
  const authError = authResult && authResult.error;
  if (authError || !user) {
    const category = authError
      ? classifyLoginAuthError(authError)
      : CATEGORY.AUTH_SERVICE_ERROR;
    await logSafely(logFailure, category, authError, "supabase-auth");
    return redirectForCategory(category);
  }

  let account;
  let accountError;
  try {
    const admin = createAdminClient();
    const result = await admin
      .from("tai_khoan")
      .select("id,trang_thai")
      .eq("id", user.id)
      .maybeSingle();
    account = result && result.data;
    accountError = result && result.error;
  } catch (error) {
    return rejectAuthenticatedUser({
      supabase,
      category: CATEGORY.AUTH_SERVICE_ERROR,
      error,
      source: "database",
      logFailure,
    });
  }

  if (accountError) {
    return rejectAuthenticatedUser({
      supabase,
      category: CATEGORY.AUTH_SERVICE_ERROR,
      error: accountError,
      source: "database",
      logFailure,
    });
  }

  if (!account) {
    return rejectAuthenticatedUser({
      supabase,
      category: CATEGORY.ACCOUNT_NOT_FOUND,
      source: "database",
      logFailure,
    });
  }

  if (account.trang_thai === "CHO_PHE_DUYET") {
    return rejectAuthenticatedUser({
      supabase,
      category: CATEGORY.ACCOUNT_PENDING,
      source: "account-state",
      logFailure,
    });
  }

  if (account.trang_thai === "KHOA") {
    return rejectAuthenticatedUser({
      supabase,
      category: CATEGORY.ACCOUNT_LOCKED,
      source: "account-state",
      logFailure,
    });
  }

  if (account.trang_thai !== "DANG_HOAT_DONG") {
    return rejectAuthenticatedUser({
      supabase,
      category: CATEGORY.ACCOUNT_STATE_REJECTED,
      source: "account-state",
      logFailure,
    });
  }

  return "/dashboard";
}
