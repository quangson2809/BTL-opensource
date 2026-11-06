"use client";

/**
 * Component không hiển thị UI, xóa các bản nháp được chỉ định khi trang xác nhận thao tác đã
 * thành công.
 */

import { useEffect } from "react";

type FormDraftClearProps = {
  scopeKey: string;
  persistKeys: string[];
  clearOn: boolean;
};

export function FormDraftClear({ scopeKey, persistKeys, clearOn }: FormDraftClearProps) {
  useEffect(() => {
    if (!clearOn) return;

    for (const persistKey of persistKeys) {
      try {
        sessionStorage.removeItem(
          "idaily:form-draft:v2:" +
            encodeURIComponent(scopeKey) +
            ":" +
            encodeURIComponent(persistKey),
        );
      } catch {
        // Clearing an optional draft must not block the confirmed server action.
      }
    }
  }, [clearOn, persistKeys, scopeKey]);

  return null;
}
