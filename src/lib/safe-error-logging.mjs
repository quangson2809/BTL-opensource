export function asRecord(value) {
  return value !== null && typeof value === "object" ? value : null;
}

export function safeLogToken(value, maxLength = 96) {
  if (typeof value !== "string") return null;
  const token = value.trim();
  if (
    token.length === 0 ||
    token.length > maxLength ||
    !/^[A-Za-z0-9._:-]+$/.test(token)
  ) {
    return null;
  }
  return token;
}

export function errorStringField(error, key) {
  const value = asRecord(error)?.[key];
  return typeof value === "string" ? value : null;
}

export function normalizeProviderErrorStatus(error) {
  const status = asRecord(error)?.status;
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : null;
}

export function normalizeOccurredAt(occurredAt) {
  return typeof occurredAt === "string" && !Number.isNaN(Date.parse(occurredAt))
    ? occurredAt
    : new Date().toISOString();
}
