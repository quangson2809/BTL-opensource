import assert from "node:assert/strict";
import { test } from "node:test";

import { meetsPasswordPolicy } from "../src/lib/password-policy.mjs";

test("password policy requires eight characters, lowercase, uppercase, and a digit", () => {
  assert.equal(meetsPasswordPolicy("Password1"), true);
  assert.equal(meetsPasswordPolicy("LongerPass9"), true);
  assert.equal(meetsPasswordPolicy("short1A"), false);
  assert.equal(meetsPasswordPolicy("lowercase1"), false);
  assert.equal(meetsPasswordPolicy("UPPERCASE1"), false);
  assert.equal(meetsPasswordPolicy("NoDigitsHere"), false);
  assert.equal(meetsPasswordPolicy("Password!"), false);
});

test("password policy rejects non-string inputs without throwing", () => {
  assert.equal(meetsPasswordPolicy(""), false);
  assert.equal(meetsPasswordPolicy(null), false);
  assert.equal(meetsPasswordPolicy(undefined), false);
  assert.equal(meetsPasswordPolicy(12345678), false);
});
