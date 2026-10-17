type StatusBadgeProps = { value: string | null | undefined };

const labels: Record<string, string> = {
  DANG_HOAT_DONG: "Đang hoạt động",
  CHO_PHE_DUYET: "Chờ phê duyệt",
  KHOA: "Đã khóa",
  "CHƯA_GỬI": "Chưa gửi",
  CHUA_GUI: "Chưa gửi",
  "ĐÃ_GỬI": "Đã gửi",
  DA_GUI: "Đã gửi",
  "ĐANG_GỬI": "Đang gửi",
  DANG_GUI: "Đang gửi",
  "THẤT_BẠI": "Thất bại",
  THAT_BAI: "Thất bại",
  "ĐÃ_ĐỌC": "Đã đọc",
  DA_DOC: "Đã đọc",
  "CHƯA_ĐỌC": "Chưa đọc",
  CHUA_DOC: "Chưa đọc",
  "KHẢO_SÁT": "Khảo sát",
  "GẶP_GỠ": "Gặp gỡ",
  "TƯ_VẤN": "Tư vấn",
  "TIN_TỨC": "Tin tức",
  "TỰ_ĐỘNG_HỆ_THỐNG": "Tự động hệ thống",
};

function toneFor(value: string) {
  if (["DANG_HOAT_DONG", "ĐÃ_GỬI", "DA_GUI", "ĐÃ_ĐỌC", "DA_DOC"].includes(value)) return "is-success";
  if (["CHO_PHE_DUYET", "CHƯA_GỬI", "CHUA_GUI", "ĐANG_GỬI", "DANG_GUI", "CHƯA_ĐỌC", "CHUA_DOC"].includes(value)) return "is-pending";
  if (["KHOA", "THẤT_BẠI", "THAT_BAI"].includes(value)) return "is-danger";
  if (["GẶP_GỠ", "TƯ_VẤN"].includes(value)) return "is-info";
  return "is-neutral";
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return <span className="status-badge is-neutral">Chưa xác định</span>;
  return <span className={"status-badge " + toneFor(normalized)}>{labels[normalized] ?? normalized.replaceAll("_", " ")}</span>;
}
