export function sanitizePostgrestOrSearch(value) {
  return (value ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").trim().slice(0, 200);
}

// Quote the PostgREST value separately from escaping the PostgreSQL regex.
// imatch avoids the '*' alias expansion performed by PostgREST's ilike parser.
export function buildLiteralSearch(columns, search) {
  if (!columns.length || columns.some((column) => !/^[a-z][a-z0-9_]*$/i.test(column))) {
    throw new Error("Search columns must be trusted identifiers");
  }
  const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = '"' + pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  return columns.map((column) => `${column}.imatch.${quoted}`).join(",");
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
