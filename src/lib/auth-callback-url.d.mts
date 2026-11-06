/**
 * Khai báo kiểu TypeScript cho auth-callback-url.mjs; mô tả đầu vào/kết quả của module
 * JavaScript và cần đồng bộ khi thay đổi API của module đó.
 */

export function getAuthCallbackUrl(input?: {
  configuredSiteUrl?: string;
  projectProductionUrl?: string;
  deploymentUrl?: string;
  nodeEnv?: string;
  vercelEnvironment?: string;
}): string;
