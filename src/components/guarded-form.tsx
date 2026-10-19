"use client";

import { useCallback, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type GuardedFormProps = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: ServerFormAction;
  children: ReactNode;
};

function PendingReset({ onComplete }: { onComplete: () => void }) {
  const { pending } = useFormStatus();
  const observedPending = useRef(false);

  useEffect(() => {
    if (pending) {
      observedPending.current = true;
    } else if (observedPending.current) {
      observedPending.current = false;
      onComplete();
    }
  }, [onComplete, pending]);

  return null;
}

/**
 * Locks a form synchronously on its first valid submit event. Unlike disabling
 * only the submit button, this also covers Enter-key submissions and double-clicks.
 * Server actions in this app redirect on success/error; useFormStatus unlocks on
 * a completed non-redirecting action so users can retry.
 */
export function GuardedForm({ action, children, ...props }: GuardedFormProps) {
  const submitting = useRef(false);
  const unlock = useCallback(() => {
    submitting.current = false;
  }, []);

  return (
    <form
      {...props}
      action={action}
      onInput={(event) => {
        event.currentTarget.dataset.userEdited = "true";
      }}
      onChange={(event) => {
        event.currentTarget.dataset.userEdited = "true";
      }}
      onSubmit={(event) => {
        if (submitting.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        submitting.current = true;
      }}
    >
      <PendingReset onComplete={unlock} />
      {children}
    </form>
  );
}
