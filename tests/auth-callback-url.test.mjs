import assert from "node:assert/strict";
import test from "node:test";

import { getAuthCallbackUrl } from "../src/lib/auth-callback-url.mjs";

test("uses explicit canonical site URL for the callback", () => {
  assert.equal(
    getAuthCallbackUrl({
      configuredSiteUrl: "https://crm.example.com/",
      deploymentUrl: "preview-branch.vercel.app",
    }),
    "https://crm.example.com/auth/callback",
  );
});

test("uses the Vercel production host when no explicit site URL is set", () => {
  assert.equal(
    getAuthCallbackUrl({ projectProductionUrl: "crm.vercel.app" }),
    "https://crm.vercel.app/auth/callback",
  );
});

test("uses the preview deployment host instead of the production host", () => {
  assert.equal(
    getAuthCallbackUrl({
      projectProductionUrl: "idaily.vercel.app",
      deploymentUrl: "idaily-git-branch.vercel.app",
      vercelEnvironment: "preview",
    }),
    "https://idaily-git-branch.vercel.app/auth/callback",
  );
});

test("uses production host for production deployments", () => {
  assert.equal(
    getAuthCallbackUrl({
      projectProductionUrl: "idaily.vercel.app",
      deploymentUrl: "idaily-other.vercel.app",
      vercelEnvironment: "production",
    }),
    "https://idaily.vercel.app/auth/callback",
  );
});

test("keeps localhost as the local-development fallback", () => {
  assert.equal(getAuthCallbackUrl(), "http://localhost:3000/auth/callback");
});

test("rejects invalid site URL configuration", () => {
  assert.throws(
    () => getAuthCallbackUrl({ configuredSiteUrl: "javascript:alert(1)" }),
    /Invalid site URL configuration/,
  );
});
