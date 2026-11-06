/**
 * Khai báo kiểu TypeScript cho list-query.mjs; mô tả đầu vào/kết quả của module JavaScript và
 * cần đồng bộ khi thay đổi API của module đó.
 */

export function sanitizePostgrestOrSearch(value: string | undefined): string;
export function parsePositivePage(value: string | undefined): number;

export function buildFilterHref(
  basePath: string,
  params: Record<string, string | undefined>,
  removedKey: string,
): string;
