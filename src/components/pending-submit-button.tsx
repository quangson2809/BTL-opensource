"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
};

export function PendingSubmitButton({
  children,
  pendingLabel = "Đang xử lý…",
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}
