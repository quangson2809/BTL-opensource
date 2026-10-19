"use client";

import { useEffect } from "react";

type FormDraftPersistenceProps = {
  persistKey: string;
  hasError: boolean;
};

type DraftValues = Record<string, string | string[]>;

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isSensitiveOrNonRestorable(control: FormControl) {
  if (control instanceof HTMLInputElement) {
    if (/^(password|hidden|file|submit|button|reset)$/i.test(control.type)) return true;
    if (/^(password|otp|token|secret|recovery)/i.test(control.name)) return true;
    if (control.autocomplete === "one-time-code") return true;
  }
  return /^(password|otp|token|secret|recovery)/i.test(control.name);
}

export function FormDraftPersistence({ persistKey, hasError }: FormDraftPersistenceProps) {
  useEffect(() => {
    const form = Array.from(document.forms).find(
      (candidate) => candidate.dataset.persistKey === persistKey,
    );
    if (!form) return;

    const storageKey = "idaily:form-draft:v1:" + persistKey;
    const controls = () =>
      Array.from(
        form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          "input[name], textarea[name], select[name]",
        ),
      ).filter((control) => control.name && !isSensitiveOrNonRestorable(control));

    if (hasError) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const values = JSON.parse(stored) as DraftValues;
          const allControls = controls();
          for (const [name, value] of Object.entries(values)) {
            const matching = allControls.filter((control) => control.name === name);
            if (matching.length === 0) continue;

            if (Array.isArray(value)) {
              if (matching.every((control) => control instanceof HTMLInputElement && control.type === "checkbox")) {
                for (const control of matching as HTMLInputElement[]) {
                  control.checked = value.includes(control.value);
                }
              } else {
                const select = matching.find(
                  (control): control is HTMLSelectElement =>
                    control instanceof HTMLSelectElement && control.multiple,
                );
                if (select) {
                  for (const option of Array.from(select.options)) {
                    option.selected = value.includes(option.value);
                  }
                }
              }
            } else if (matching.every((control) => control instanceof HTMLInputElement && control.type === "radio")) {
              for (const control of matching as HTMLInputElement[]) {
                control.checked = control.value === value;
              }
            } else {
              const control = matching[0];
              if (
                (control instanceof HTMLInputElement ||
                  control instanceof HTMLTextAreaElement ||
                  control instanceof HTMLSelectElement) &&
                typeof value === "string"
              ) {
                control.value = value;
              }
            }
          }
        }
      } catch {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Storage can be unavailable in restricted browser contexts. */
        }
      }
    } else {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Draft persistence is an enhancement only. */
      }
    }

    const saveDraft = () => {
      const currentControls = controls();
      const values: DraftValues = {};
      const names = [...new Set(currentControls.map((control) => control.name))];

      for (const name of names) {
        const matching = currentControls.filter((control) => control.name === name);
        if (matching.every((control) => control instanceof HTMLInputElement && control.type === "checkbox")) {
          values[name] = (matching as HTMLInputElement[])
            .filter((control) => control.checked)
            .map((control) => control.value);
          continue;
        }
        if (matching.every((control) => control instanceof HTMLInputElement && control.type === "radio")) {
          const selected = (matching as HTMLInputElement[]).find((control) => control.checked);
          if (selected) values[name] = selected.value;
          continue;
        }

        const control = matching[0];
        if (control instanceof HTMLSelectElement && control.multiple) {
          values[name] = Array.from(control.selectedOptions).map((option) => option.value);
        } else {
          values[name] = control.value;
        }
      }

      try {
        sessionStorage.setItem(storageKey, JSON.stringify(values));
      } catch {
        /* Form submission still works if storage is blocked. */
      }
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
