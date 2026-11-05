export function sanitizePostgrestOrSearch(value: string | undefined): string;
export function buildLiteralSearch(columns: readonly string[], search: string): string;
export function parsePositivePage(value: string | undefined): number;

export function buildFilterHref(basePath: string, params: Record<string, string | undefined>, removedKey: string): string;
