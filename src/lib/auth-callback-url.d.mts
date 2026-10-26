export function getAuthCallbackUrl(input?: {
  configuredSiteUrl?: string;
  projectProductionUrl?: string;
  deploymentUrl?: string;
  nodeEnv?: string;
  vercelEnvironment?: string;
}): string;
