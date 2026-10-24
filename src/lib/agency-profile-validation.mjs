export function validateAgencyProfileName(value) {
  if (typeof value !== "string") {
    return { ok: false, code: "missing" };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { ok: false, code: "missing" };
  }

  // Names are single-line display values; reject control characters on the server.
  if (/[\u0000-\u001F\u007F-\u009F]/u.test(normalized)) {
    return { ok: false, code: "invalid" };
  }

  return { ok: true, value: normalized };
}


export function validateAgencyProfilePhone(value) {
  if (typeof value !== "string") {
    return { ok: false, code: "invalid-phone" };
  }
  const normalized = value.trim();
  if (!/^\\+?[0-9][0-9\\s().-]{7,19}$/u.test(normalized)) {
    return { ok: false, code: "invalid-phone" };
  }
  return { ok: true, value: normalized };
}
