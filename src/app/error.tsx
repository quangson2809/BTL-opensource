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
          description="Hệ thống chưa thể hoàn tất yêu cầu. Dữ liệu kỹ thuật được giữ lại trong log, không hiển thị trong giao diện."
          onRetry={reset}
          title="Có lỗi xảy ra"
        />
      </section>
    </main>
  );
}
