/**
 * Khai báo kiểu TypeScript cho agency-profile-validation.mjs; mô tả đầu vào/kết quả của module
 * JavaScript và cần đồng bộ khi thay đổi API của module đó.
 */

export type AgencyProfileNameValidation =
  | { ok: true; value: string }
  | { ok: false; code: "missing" | "invalid" };

export function validateAgencyProfileName(value: unknown): AgencyProfileNameValidation;

export type AgencyProfilePhoneValidation =
  | { ok: true; value: string }
  | { ok: false; code: "invalid-phone" };

export function validateAgencyProfilePhone(value: unknown): AgencyProfilePhoneValidation;
