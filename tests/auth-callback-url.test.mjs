import assert from "node:assert/strict";
import { test } from "node:test";

import { getAuthCallbackUrl } from "../src/lib/auth-callback-url.mjs";

test("local development uses the local callback only outside production", () => {
  assert.equal(
    getAuthCallbackUrl({ nodeEnv: "development" }),
    "http://localhost:3000/auth/callback",
  );
});

test("production uses the configured site origin and strips any path", () => {
  assert.equal(
    getAuthCallbackUrl({
      configuredSiteUrl: "https://crm.example.test/nested/path",
      projectProductionUrl: "idaily.vercel.app",
      nodeEnv: "production",
      vercelEnvironment: "production",
    }),
    "https://crm.example.test/auth/callback",
  );
});

test("preview deployments use their own deployment URL when no explicit site URL exists", () => {
  assert.equal(
    getAuthCallbackUrl({
      projectProductionUrl: "idaily.vercel.app",
      deploymentUrl: "idaily-git-feature-branch.vercel.app",
      nodeEnv: "production",
      vercelEnvironment: "preview",
    }),
    "https://idaily-git-feature-branch.vercel.app/auth/callback",
  );
});

test("production fails closed instead of generating a localhost confirmation link", () => {
  assert.throws(
    () => getAuthCallbackUrl({ nodeEnv: "production" }),
    /Missing site URL configuration/,
  );
  assert.throws(
    () => getAuthCallbackUrl({
      configuredSiteUrl: "http://localhost:3000",
      nodeEnv: "production",
    }),
    /cannot use a localhost URL/,
  );
});

test("invalid schemes and credential-bearing callback URLs are rejected", () => {
  assert.throws(
    () => getAuthCallbackUrl({ configuredSiteUrl: "javascript:alert(1)" }),
    /Invalid site URL configuration/,
  );
  assert.throws(
    () => getAuthCallbackUrl({ configuredSiteUrl: "https://user:pass@example.test" }),
    /Invalid site URL configuration/,
  );
});
