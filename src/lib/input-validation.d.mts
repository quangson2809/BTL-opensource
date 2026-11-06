/**
 * Khai báo kiểu TypeScript cho input-validation.mjs; mô tả đầu vào/kết quả của module JavaScript
 * và cần đồng bộ khi thay đổi API của module đó.
 */

export function isUuid(value: string): boolean;
export function isValidDateOnly(value: string): boolean;
export function parseNonNegativeInt32(value: string): number | null;
export function parseVietnamLocalDateTime(value: string): string | null;
