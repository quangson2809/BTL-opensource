import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <main>
      <section className="card wide-card">
        <EmptyState
          actionHref="/"
          actionLabel="Về trang chủ"
          description="Địa chỉ có thể không còn tồn tại hoặc bản ghi không nằm trong phạm vi có thể truy cập."
          title="Không tìm thấy trang hoặc bản ghi"
        />
      </section>
    </main>
  );
}
