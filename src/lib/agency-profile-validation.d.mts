export type AgencyProfileNameValidation =
  | { ok: true; value: string }
  | { ok: false; code: "missing" | "invalid" };

export function validateAgencyProfileName(value: unknown): AgencyProfileNameValidation;
