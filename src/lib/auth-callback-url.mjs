function normalizeOrigin(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

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

  const hasUnsupportedProtocol = !["http:", "https:"].includes(parsed.protocol);
  const hasCredentials = Boolean(parsed.username || parsed.password);

  if (hasUnsupportedProtocol || hasCredentials) {
    throw new Error("Invalid site URL configuration.");
  }

  return parsed;
}

function isLoopbackHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

export function getAuthCallbackUrl({
  configuredSiteUrl,
  projectProductionUrl,
  deploymentUrl,
  nodeEnv = "development",
  vercelEnvironment,
} = {}) {
  const configuredUrl =
    typeof configuredSiteUrl === "string" ? configuredSiteUrl.trim() : "";
  const isPreviewDeployment = vercelEnvironment === "preview";

  // Preview callbacks should return to the preview deployment, not production.
  const deploymentOrigin = isPreviewDeployment
    ? deploymentUrl || projectProductionUrl
    : projectProductionUrl || deploymentUrl;

  const selectedSiteUrl =
    configuredUrl ||
    deploymentOrigin ||
    (nodeEnv !== "production" ? "http://localhost:3000" : "");

  if (!selectedSiteUrl) {
    throw new Error(
      "Missing site URL configuration for production Auth callback.",
    );
  }

  const parsedOrigin = normalizeOrigin(selectedSiteUrl);
  if (!parsedOrigin) {
    throw new Error(
      "Missing site URL configuration for production Auth callback.",
    );
  }

  if (nodeEnv === "production" && isLoopbackHost(parsedOrigin.hostname)) {
    throw new Error("Production Auth callback cannot use a localhost URL.");
  }

  return new URL("/auth/callback", parsedOrigin.origin).toString();
}
