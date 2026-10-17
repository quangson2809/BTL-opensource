"use client";

import { useEffect } from "react";

type FormDraftPersistenceProps = {
  persistKey: string;
  hasError: boolean;
};

type DraftValues = Record<string, string | string[]>;

export function FormDraftPersistence({ persistKey, hasError }: FormDraftPersistenceProps) {
  useEffect(() => {
    const form = Array.from(document.forms).find((candidate) => candidate.dataset.persistKey === persistKey);
    if (!form) return;

    const storageKey = "idaily:form-draft:v1:" + persistKey;

    if (hasError) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const values = JSON.parse(stored) as DraftValues;
          for (const [name, value] of Object.entries(values)) {
            const control = form.elements.namedItem(name);
            if (control instanceof HTMLSelectElement && control.multiple && Array.isArray(value)) {
              for (const option of Array.from(control.options)) option.selected = value.includes(option.value);
            } else if (
              (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) &&
              typeof value === "string" &&
              control.type !== "hidden"
            ) {
              control.value = value;
            }
          }
        }
      } catch {
        try { sessionStorage.removeItem(storageKey); } catch { /* Storage can be unavailable in restricted browser contexts. */ }
      }
    } else {
      try { sessionStorage.removeItem(storageKey); } catch { /* Draft persistence is an enhancement only. */ }
    }

    const saveDraft = () => {
      const values: DraftValues = {};
      const controls = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input[name], textarea[name], select[name]",
      );
      for (const control of Array.from(controls)) {
        if (!control.name || control.type === "hidden") continue;
        if (control instanceof HTMLSelectElement && control.multiple) {
          values[control.name] = Array.from(control.selectedOptions).map((option) => option.value);
        } else {
          values[control.name] = control.value;
        }
      }
      try { sessionStorage.setItem(storageKey, JSON.stringify(values)); } catch { /* Form submission still works if storage is blocked. */ }
    };

    form.addEventListener("input", saveDraft);
    form.addEventListener("change", saveDraft);
    form.addEventListener("submit", saveDraft);
    return () => {
      form.removeEventListener("input", saveDraft);
      form.removeEventListener("change", saveDraft);
      form.removeEventListener("submit", saveDraft);
    };
  }, [hasError, persistKey]);

  return null;
}
