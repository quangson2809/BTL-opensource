export const accountStatusLabels = Object.freeze({
  CHO_PHE_DUYET: "Chờ phê duyệt",
  DANG_HOAT_DONG: "Đang hoạt động",
  KHOA: "Đã khóa",
});

const UNKNOWN_ACCOUNT_STATUS_LABEL = "Chưa xác định trạng thái";
const RECIPIENT_GROUP_LABEL = "Người nhận trong phạm vi";

/**
 * Convert account rows returned by the existing recipient queries into the
 * presentation options consumed by SearchableCheckboxPicker.
 * Query scope and filtering intentionally remain the responsibility of each page.
 */
export function toNotificationRecipientOptions(recipients) {
  return (recipients ?? []).map((recipient) => ({
    id: recipient.id,
    label: recipient.ho_ten,
    detail:
      recipient.ma_dai_ly +
      " · " +
      (accountStatusLabels[recipient.trang_thai] ?? UNKNOWN_ACCOUNT_STATUS_LABEL),
    searchText:
      recipient.ho_ten + " " + recipient.ma_dai_ly + " " + recipient.trang_thai,
    group: RECIPIENT_GROUP_LABEL,
  }));
}
