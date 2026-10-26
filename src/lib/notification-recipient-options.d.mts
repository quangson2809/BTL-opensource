import type { SearchableCheckboxOption } from "@/components/searchable-checkbox-picker";

export const accountStatusLabels: Readonly<Record<string, string>>;

type NotificationRecipientRow = {
  id: string;
  ho_ten: string;
  ma_dai_ly: string;
  trang_thai: string;
};

export function toNotificationRecipientOptions(
  recipients: NotificationRecipientRow[] | null | undefined,
): SearchableCheckboxOption[];
