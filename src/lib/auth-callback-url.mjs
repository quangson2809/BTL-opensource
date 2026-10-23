export function getAuthCallbackUrl({
  configuredSiteUrl,
  projectProductionUrl,
  deploymentUrl,
} = {}) {
  const configured = typeof configuredSiteUrl === "string" ? configuredSiteUrl.trim() : "";
  const productionHost = typeof projectProductionUrl === "string" ? projectProductionUrl.trim() : "";
  const fallbackHost = typeof deploymentUrl === "string" ? deploymentUrl.trim() : "";
  const deploymentHost = productionHost || fallbackHost;
  const deploymentOrigin = deploymentHost
    ? new URL(
        deploymentHost.startsWith("http://") || deploymentHost.startsWith("https://")
          ? deploymentHost
          : `https://${deploymentHost}`,
      ).origin
    : null;
  const siteUrl = configured || deploymentOrigin || "http://localhost:3000";
  const parsedUrl = new URL(siteUrl);

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error("Invalid site URL configuration.");
  }

  return new URL("/auth/callback", parsedUrl.origin).toString();
}
