"use client";

export default function ReportsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <section className="card wide-card">
        <h1>Không thể tải báo cáo</h1>
        <p role="alert" className="error-state">
          Đã xảy ra lỗi khi mở trang báo cáo. Dữ liệu biểu đồ chưa được xác nhận và sẽ không hiển thị số liệu thay thế.
        </p>
        <div className="actions">
          <button type="button" onClick={reset}>Thử tải lại</button>
        </div>
      </section>
    </main>
  );
}
