const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_PATTERN.test(value);
}

export function isValidDateOnly(value) {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseNonNegativeInt32(value) {
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 2147483647) {
    return null;
  }

  return parsed;
}

export function parseVietnamLocalDateTime(value) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match || !isValidDateOnly(match[1])) return null;

  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const parsed = new Date(value + ":00+07:00");
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
