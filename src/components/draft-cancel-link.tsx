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
    onClick?.(event);
  }

  return <Link {...linkProps} onClick={handleClick} />;
}
