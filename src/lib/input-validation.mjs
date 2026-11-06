/**
 * Hàm kiểm tra UUID, ngày thực tế, số nguyên không âm vừa kiểu PostgreSQL integer và chuyển
 * datetime-local Việt Nam sang ISO UTC.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_PATTERN.test(value);
}

/**
 * So khớp ngược ngày ISO để loại cả ngày không tồn tại, ví dụ 31/02, thay vì chỉ kiểm tra định
 * dạng.
 */
export function isValidDateOnly(value) {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Giới hạn theo PostgreSQL integer (2^31 - 1); trả null để bên gọi phân biệt số 0 hợp lệ với dữ
 * liệu sai.
 */
export function parseNonNegativeInt32(value) {
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 2147483647) {
    return null;
  }

  return parsed;
}

/**
 * datetime-local không có múi giờ: gắn +07:00 rõ ràng để kết quả không phụ thuộc timezone của
 * máy chủ.
 */
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
