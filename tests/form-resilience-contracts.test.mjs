import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("draft persistence excludes credential-like names and sensitive input types", async () => {
  const source = await readSource("../src/components/form-draft-persistence.tsx");

  assert.match(source, /SENSITIVE_NAME\s*=\s*\/password\|passwd\|otp\|token\|secret\|recovery\|credential\|authorization\|cookie\|csrf\|nonce\/i);
  assert.match(source, /SENSITIVE_TYPE\s*=\s*new Set\(\["password", "hidden", "file", "submit", "button", "reset"\]\)/);
  assert.match(source, /if \(!control\.name \|\| SENSITIVE_NAME\.test\(control\.name\)\) return false/);
  assert.match(source, /SENSITIVE_TYPE\.has\(control\.type\)/);
});

test("draft storage keys are scoped by form and account without storing field values in keys", async () => {
  const source = await readSource("../src/components/form-draft-persistence.tsx");

  assert.match(source, /encodeURIComponent\(scopeKey\)/);
  assert.match(source, /encodeURIComponent\(persistKey\)/);
  assert.match(source, /sessionStorage\.setItem\(storageKey, serialized\)/);
  assert.match(source, /MAX_DRAFT_LENGTH/);
});

test("public authentication forms wire persistence only to explicitly named forms", async () => {
  const cases = [
    ["../src/app/login/page.tsx", "login"],
    ["../src/app/register/page.tsx", "register"],
    ["../src/app/password/recovery/page.tsx", "password-recovery"],
    ["../src/app/password/recovery/verify/page.tsx", "password-recovery-verify"],
  ];

  for (const [path, persistKey] of cases) {
    const source = await readSource(path);
    assert.ok(source.includes(`persistKey="${persistKey}"`), `${path} must mount FormDraftPersistence`);
    assert.ok(source.includes(`data-persist-key="${persistKey}"`), `${path} form must match its persistence key`);
    assert.ok(source.includes('scopeKey="public-auth"'), `${path} must isolate public-auth drafts`);
  }
});

test("recovery OTP and password fields are present but excluded by persistence filters", async () => {
  const page = await readSource("../src/app/password/recovery/verify/page.tsx");
  const persistence = await readSource("../src/components/form-draft-persistence.tsx");

  assert.match(page, /name="otp"/);
  assert.match(page, /name="new_password" type="password"/);
  assert.match(page, /name="confirm_password"/);
  assert.match(persistence, /SENSITIVE_NAME\.test\(control\.name\)/);
  assert.match(persistence, /SENSITIVE_TYPE\.has\(control\.type\)/);
});

test("duplicate submission guard locks synchronously and unlocks after pending resolves", async () => {
  const source = await readSource("../src/components/guarded-form.tsx");

  assert.match(source, /if \(submitting\.current\)/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /submitting\.current = true/);
  assert.match(source, /const \{ pending \} = useFormStatus\(\)/);
  assert.match(source, /onComplete\(\)/);
});

test("draft clearing is gated on confirmed success or explicit cancellation", async () => {
  const clear = await readSource("../src/components/form-draft-clear.tsx");
  const cancel = await readSource("../src/components/draft-cancel-link.tsx");
  const login = await readSource("../src/app/login/page.tsx");
  const verify = await readSource("../src/app/password/recovery/verify/page.tsx");

  assert.match(clear, /if \(!clearOn\) return/);
  assert.match(clear, /sessionStorage\.removeItem/);
  assert.match(cancel, /sessionStorage\.removeItem/);
  assert.match(login, /clearOn=\{Boolean\(statusMessage\)\}/);
  assert.match(verify, /clearOn=\{otpSent\}/);
});
