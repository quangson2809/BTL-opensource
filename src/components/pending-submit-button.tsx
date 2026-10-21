"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import {
  getSubmitPresentation,
  shouldCancelSubmission,
} from "@/lib/interaction-contracts.mjs";

type PendingSubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  confirmMessage?: string;
  disabled?: boolean;
};

export function PendingSubmitButton({
  children,
  pendingLabel = "Đang xử lý…",
  confirmMessage,
  disabled = false,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const presentation = getSubmitPresentation(pending, pendingLabel, children);

  const isDisabled = presentation.disabled || disabled;

  return (
    <button
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onClick={(event) => {
        const cancelled = shouldCancelSubmission(
          confirmMessage,
          (message) => window.confirm(message),
        );
        if (cancelled) event.preventDefault();
      }}
      type="submit"
    >
      {presentation.label}
    </button>
  );
}
