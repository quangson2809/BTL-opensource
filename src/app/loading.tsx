export default function Loading() {
  return (
    <main aria-busy="true">
      <section aria-label="Đang tải" className="loading-state" role="status">
        <span aria-hidden="true" className="loading-indicator" />
        <p>Đang tải dữ liệu…</p>
      </section>
    </main>
  );
}
