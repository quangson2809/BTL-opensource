import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <section aria-label={title} className="empty-state" role="status">
      <h2>{title}</h2>
      <p>{description}</p>
      {actionHref && actionLabel ? (
        <p className="empty-state-action">
          <Link className="button-link" href={actionHref}>
            {actionLabel}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
