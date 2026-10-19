"use client";

import { useEffect } from "react";

type FormDraftPersistenceProps = {
  persistKey: string;
  hasError: boolean;
  scopeKey?: string;
};

type DraftValue = string | string[];
type DraftValues = Record<string, DraftValue>;

const DRAFT_VERSION = 2;
const MAX_DRAFT_BYTES = 32_768;
const SENSITIVE_NAME = /password|passwd|otp|token|secret|recovery|credential|authorization|cookie|csrf|nonce/i;
const SENSITIVE_TYPE = new Set(["password", "hidden", "file", "submit", "button", "reset"]);

function isDraftValue(value: unknown): value is DraftValue {
  return (
    typeof value === "string" ||
    (Array.isArray(value) &&
      value.length <= 500 &&
      value.every((item) => typeof item === "string" && item.length <= 2_000))
  );
}

function canPersist(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (!control.name || SENSITIVE_NAME.test(control.name)) return false;
  if (control instanceof HTMLInputElement && SENSITIVE_TYPE.has(control.type)) return false;
  return true;
}

function restoreDraft(form: HTMLFormElement, values: DraftValues) {
  const controls = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input[name], textarea[name], select[name]",
    ),
  );

  for (const control of controls) {
    if (!canPersist(control)) continue;
    const value = values[control.name];
    if (value === undefined) continue;

    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      control.checked = Array.isArray(value) && value.includes(control.value);
      continue;
    }

    if (control instanceof HTMLInputElement && control.type === "radio") {
      control.checked = typeof value === "string" && value === control.value;
      continue;
    }

    if (control instanceof HTMLSelectElement && control.multiple) {
      if (Array.isArray(value)) {
        for (const option of Array.from(control.options)) {
          option.selected = value.includes(option.value);
        }
      }
      continue;
    }

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

function readDraft(storageKey: string): DraftValues | null {
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored || stored.length > MAX_DRAFT_BYTES) return null;

    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== DRAFT_VERSION ||
      !("values" in parsed) ||
      typeof parsed.values !== "object" ||
      parsed.values === null ||
      Array.isArray(parsed.values)
    ) {
      return null;
    }

    const values: DraftValues = {};
    for (const [name, value] of Object.entries(parsed.values)) {
      if (!SENSITIVE_NAME.test(name) && isDraftValue(value)) {
        values[name] = value;
      }
    }
    return values;
  } catch {
    return null;
  }
}

export function FormDraftPersistence({
  persistKey,
  hasError,
  scopeKey = "anonymous",
}: FormDraftPersistenceProps) {
  useEffect(() => {
    const form = Array.from(document.forms).find(
      (candidate) => candidate.dataset.persistKey === persistKey,
    );
    if (!form) return;

    // Keys contain only form/entity identifiers, never form values or credentials.
    const storageKey =
      "idaily:form-draft:v" +
      DRAFT_VERSION +
      ":" +
      encodeURIComponent(scopeKey) +
      ":" +
      encodeURIComponent(persistKey);

    if (hasError) {
      const values = readDraft(storageKey);
      if (values) restoreDraft(form, values);
      else {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          // Draft persistence is an optional enhancement.
        }
      }
    } else {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Storage may be unavailable in restricted browser contexts.
      }
    }

    const saveDraft = () => {
      const values: DraftValues = {};
      const controls = Array.from(
        form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          "input[name], textarea[name], select[name]",
        ),
      );

      for (const control of controls) {
        if (!canPersist(control)) continue;

        if (control instanceof HTMLInputElement && control.type === "checkbox") {
          if (!Array.isArray(values[control.name])) values[control.name] = [];
          if (control.checked) (values[control.name] as string[]).push(control.value);
        } else if (control instanceof HTMLInputElement && control.type === "radio") {
          if (control.checked) values[control.name] = control.value;
        } else if (control instanceof HTMLSelectElement && control.multiple) {
          values[control.name] = Array.from(control.selectedOptions).map((option) => option.value);
        } else {
          values[control.name] = control.value;
        }
      }

      try {
        const serialized = JSON.stringify({ version: DRAFT_VERSION, values });
        if (serialized.length <= MAX_DRAFT_BYTES) {
          sessionStorage.setItem(storageKey, serialized);
        }
      } catch {
        // The form must remain usable if storage is unavailable or full.
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
  }, [hasError, persistKey, scopeKey]);

  return null;
}
