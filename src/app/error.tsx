"use client";

import { ErrorState } from "@/components/error-state";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ reset }: AppErrorProps) {
  return (
    <main>
      <section className="card">
        <ErrorState
          description="Hệ thống chưa thể hoàn tất yêu cầu. Hãy thử lại; nếu lỗi tiếp tục, quay về trang trước và thử lại sau."
          onRetry={reset}
          title="Có lỗi xảy ra"
        />
      </section>
    </main>
  );
}
