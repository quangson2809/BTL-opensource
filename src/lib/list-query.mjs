export function sanitizePostgrestOrSearch(value) {
  // A conservative allow-list prevents user input from becoming PostgREST filter syntax.
  return (value ?? "").trim().replace(/[^\\p{L}\\p{N}\\s@+-]/gu, " ").trim();
}

export function parsePositivePage(value) {
  if (!value || !/^\\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
