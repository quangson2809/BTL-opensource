"use client";

import { useRouter } from "next/navigation";

type ErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Không thể tải dữ liệu",
  description = "Đã xảy ra lỗi khi xử lý yêu cầu. Hãy thử tải lại.",
  retryLabel = "Thử lại",
  onRetry,
}: ErrorStateProps) {
  const router = useRouter();

  return (
    <section aria-labelledby="error-state-title" className="error-state" role="alert">
      <h2 id="error-state-title">{title}</h2>
      <p>{description}</p>
      <button onClick={onRetry ?? (() => router.refresh())} type="button">
        {retryLabel}
      </button>
    </section>
  );
}
