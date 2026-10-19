"use client";

import { ErrorState } from "@/components/error-state";

import "./globals.css";
import "./workspace.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="vi">
      <body>
        <main>
          <section className="card wide-card">
            <ErrorState
              description="Hệ thống gặp lỗi nghiêm trọng và chưa thể hiển thị trang. Hãy thử lại hoặc quay về trang chủ."
              onRetry={reset}
              title="Không thể hiển thị ứng dụng"
            />
          </section>
        </main>
      </body>
    </html>
  );
}
