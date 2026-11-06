/**
 * Nhóm mã quyền theo tiền tố nghiệp vụ để danh sách quyền dễ tìm và có nhóm dự phòng cho mã chưa
 * biết.
 */

const PERMISSION_GROUPS = Object.freeze({
  ACTIVITY: "Hoạt động",
  ACCOUNT: "Tài khoản",
  CUSTOMER: "Khách hàng",
  NOTIFICATION: "Thông báo",
  ORDER: "Đơn hàng",
  PERSONNEL: "Nhân sự",
  REPORT: "Báo cáo",
  ROLE: "Vai trò & quyền",
  VOUCHER: "Khuyến mãi",
});

export function permissionGroupForCode(code) {
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  const prefix = normalized.split("_", 1)[0];
  return PERMISSION_GROUPS[prefix] ?? "Quyền khác";
}
