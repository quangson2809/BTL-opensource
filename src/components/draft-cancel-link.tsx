"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

type DraftCancelLinkProps = ComponentProps<typeof Link> & {
  scopeKey: string;
  persistKeys: string[];
};

export function DraftCancelLink({
  scopeKey,
  persistKeys,
  onClick,
  ...linkProps
}: DraftCancelLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.target === "_blank"
    ) {
      return;
    }

    for (const persistKey of persistKeys) {
      try {
        sessionStorage.removeItem(
          "idaily:form-draft:v2:" +
            encodeURIComponent(scopeKey) +
            ":" +
            encodeURIComponent(persistKey),
        );
      } catch {
        // Cancellation/navigation must remain available if storage is blocked.
      }
    }
  }

  return <Link {...linkProps} onClick={handleClick} />;
}
