export type OtpDeliveryErrorCategory =
  | "rate-limited"
  | "email-not-authorized"
  | "redirect-invalid"
  | "email-provider"
  | "service";

export function classifyOtpDeliveryError(error: unknown): OtpDeliveryErrorCategory;

export function createOtpDeliveryFailureLog(input: {
  flow: "password-change" | "password-recovery";
  error: unknown;
  requestId?: string | null;
}): {
  event: "auth.otp_delivery.failed";
  flow: "password-change" | "password-recovery";
  category: OtpDeliveryErrorCategory;
  providerErrorCode: string | null;
  providerErrorName: string | null;
  providerStatus: number | null;
  requestId: string | null;
};
