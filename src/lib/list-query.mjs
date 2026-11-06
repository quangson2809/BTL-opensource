/**
 * Chuẩn hóa từ khóa cho bộ lọc PostgREST, số trang dương và URL khi bỏ một bộ lọc.
 */

/**
 * Chỉ giữ ký tự cho phép để từ khóa không trở thành cú pháp bộ lọc PostgREST.
 */
export function sanitizePostgrestOrSearch(value) {
  // A conservative allow-list prevents user input from becoming PostgREST filter syntax.
  return (value ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}\s@+-]/gu, " ")
    .trim();
}

/**
 * Đưa số trang thiếu/sai/vượt phạm vi số nguyên an toàn về trang 1; trang gọi giới hạn thêm theo
 * tổng kết quả.
 */
export function parsePositivePage(value) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Bỏ bộ lọc được chọn và tham số page để việc thay điều kiện luôn bắt đầu lại từ trang đầu.
 */
export function buildFilterHref(basePath, params, removedKey) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== removedKey && key !== "page" && value) next.set(key, value);
  }
  const query = next.toString();
  return query ? basePath + "?" + query : basePath;
}
