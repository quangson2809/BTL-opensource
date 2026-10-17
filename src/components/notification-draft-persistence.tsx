"use client";

import { useEffect } from "react";

type Props = { hasError: boolean };
type DraftValues = Record<string, string | string[]>;
const STORAGE_KEY = "idaily:notification-draft:v1";

export function NotificationDraftPersistence({ hasError }: Props) {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>('form[data-persist-key="notification-draft"]');
    if (!form) return;

    if (hasError) {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const values = JSON.parse(stored) as DraftValues;
          for (const [name, value] of Object.entries(values)) {
            const control = form.elements.namedItem(name);
            if (control instanceof HTMLSelectElement && control.multiple && Array.isArray(value)) {
              for (const option of Array.from(control.options)) option.selected = value.includes(option.value);
            } else if ((control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) && typeof value === "string") {
              control.value = value;
            }
          }
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }

    const saveDraft = () => {
      const values: DraftValues = {};
      const controls = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]");
      for (const control of Array.from(controls)) {
        if (control.name === "recipient_ids" && control instanceof HTMLSelectElement && control.multiple) {
          values[control.name] = Array.from(control.selectedOptions).map((option) => option.value);
        } else if (control.type !== "hidden" && control.name) {
          values[control.name] = control.value;
        }
      }
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch { /* Form submission remains available if storage is blocked. */ }
    };

    form.addEventListener("input", saveDraft);
    form.addEventListener("change", saveDraft);
    form.addEventListener("submit", saveDraft);
    return () => {
      form.removeEventListener("input", saveDraft);
      form.removeEventListener("change", saveDraft);
      form.removeEventListener("submit", saveDraft);
    };
  }, [hasError]);

  return null;
}
