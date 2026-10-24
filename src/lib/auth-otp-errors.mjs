const RATE_LIMIT_CODES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "over_sms_send_rate_limit",
]);

const EMAIL_NOT_AUTHORIZED_CODES = new Set([
  "email_address_not_authorized",
]);

function getErrorFields(error) {
  if (!error || typeof error !== "object") {
    return { code: "", message: "", status: 0, name: "" };
  }

  const value = error;
  return {
    code: typeof value.code === "string" ? value.code.toLowerCase() : "",
    message: typeof value.message === "string" ? value.message.toLowerCase() : "",
    status: typeof value.status === "number" ? value.status : 0,
    name: typeof value.name === "string" ? value.name : "",
  };
}

export function classifyOtpDeliveryError(error) {
  const { code, message, status } = getErrorFields(error);
  const combined = `${code} ${message}`;

  if (
    status === 429 ||
    [...RATE_LIMIT_CODES].some((item) => combined.includes(item)) ||
    /rate.?limit|too many requests/.test(combined)
  ) {
    return "rate-limited";
  }

  if (
    [...EMAIL_NOT_AUTHORIZED_CODES].some((item) => combined.includes(item)) ||
    /recipient.*not authorized|only.*team.*email|email.*not.*authorized|testing purposes/.test(combined)
  ) {
    return "email-not-authorized";
  }

  if (
    /redirect.*(not allowed|invalid|allow.?list)|invalid.*redirect|redirect_to/.test(combined)
  ) {
    return "redirect-invalid";
  }

  if (
    /smtp|email provider|sending email|send.*email|mail server|failed to send/.test(combined) ||
    status >= 500
  ) {
    return "email-provider";
  }

  return "service";
}

export function createOtpDeliveryFailureLog({ flow, error, requestId = null }) {
  const { code, name, status } = getErrorFields(error);
  const safeCode = /^[a-z0-9_]{1,80}$/.test(code) ? code : null;
  const safeName = /^[a-z0-9_]{1,80}$/i.test(name) ? name : null;

  return {
    event: "auth.otp_delivery.failed",
    flow,
    category: classifyOtpDeliveryError(error),
    providerErrorCode: safeCode,
    providerErrorName: safeName,
    providerStatus: Number.isInteger(status) && status >= 0 && status <= 599 ? status : null,
    requestId: typeof requestId === "string" && requestId.length <= 200 ? requestId : null,
  };
}
