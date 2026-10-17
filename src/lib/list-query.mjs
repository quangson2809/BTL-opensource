export function sanitizePostgrestOrSearch(value) {
  // Prevent query input from introducing separators or operators into a PostgREST .or() filter.
  return (value ?? "").trim().replace(/[(),.\\%_]/g, " ").trim();
}

export function parsePositivePage(value) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
