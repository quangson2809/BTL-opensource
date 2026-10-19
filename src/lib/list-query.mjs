export function sanitizePostgrestOrSearch(value) {
  // A conservative allow-list prevents user input from becoming PostgREST filter syntax.
  return (value ?? "").trim().replace(/[^\p{L}\p{N}\s@+-]/gu, " ").trim();
}

export function parsePositivePage(value) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}


export function buildFilterHref(basePath, params, removedKey) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== removedKey && key !== "page" && value) next.set(key, value);
  }
  const query = next.toString();
  return query ? basePath + "?" + query : basePath;
}
