"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type PendingSubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  confirmMessage?: string;
};

export function PendingSubmitButton({
  children,
  pendingLabel = "Đang xử lý…",
  confirmMessage,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
