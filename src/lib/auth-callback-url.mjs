function normalizeOrigin(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = value.trim();
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;
  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Invalid site URL configuration.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Invalid site URL configuration.");
  }

  return parsed;
}

function isLoopbackHost(hostname) {
  return hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");
}

export function getAuthCallbackUrl({
  configuredSiteUrl,
  projectProductionUrl,
  deploymentUrl,
  nodeEnv = "development",
  vercelEnvironment,
} = {}) {
  const configured = typeof configuredSiteUrl === "string"
    ? configuredSiteUrl.trim()
    : "";
  const usePreviewHost = vercelEnvironment === "preview";
  const deploymentOrigin = usePreviewHost
    ? deploymentUrl || projectProductionUrl
    : projectProductionUrl || deploymentUrl;
  const selectedSiteUrl = configured ||
    deploymentOrigin ||
    (nodeEnv !== "production" ? "http://localhost:3000" : "");

  if (!selectedSiteUrl) {
    throw new Error("Missing site URL configuration for production Auth callback.");
  }

  const parsed = normalizeOrigin(selectedSiteUrl);
  if (!parsed) {
    throw new Error("Missing site URL configuration for production Auth callback.");
  }
  if (nodeEnv === "production" && isLoopbackHost(parsed.hostname)) {
    throw new Error("Production Auth callback cannot use a localhost URL.");
  }

  return new URL("/auth/callback", parsed.origin).toString();
}
