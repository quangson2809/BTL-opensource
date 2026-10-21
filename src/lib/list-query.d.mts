export function sanitizePostgrestOrSearch(value: string | undefined): string;
export function parsePositivePage(value: string | undefined): number;

export function buildFilterHref(basePath: string, params: Record<string, string | undefined>, removedKey: string): string;
