export type AgencyProfileNameValidation =
  | { ok: true; value: string }
  | { ok: false; code: "missing" | "invalid" };

export function validateAgencyProfileName(value: unknown): AgencyProfileNameValidation;

export type AgencyProfilePhoneValidation =
  | { ok: true; value: string }
  | { ok: false; code: "invalid-phone" };

export function validateAgencyProfilePhone(value: unknown): AgencyProfilePhoneValidation;
