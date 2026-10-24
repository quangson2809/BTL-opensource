export default function ReportsLoading() {
  return (
    <main>
      <section className="card wide-card" aria-busy="true" aria-live="polite">
        <h1>Báo cáo & thống kê</h1>
        <p role="status">Đang tải số liệu báo cáo và biểu đồ…</p>
        <div
          aria-hidden="true"
          style={{
            display: "grid",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <div style={{ height: "3.5rem", borderRadius: "0.6rem", background: "#edf2ee" }} />
          <div style={{ height: "8rem", borderRadius: "0.6rem", background: "#edf2ee" }} />
          <div style={{ height: "10rem", borderRadius: "0.6rem", background: "#edf2ee" }} />
        </div>
      </section>
    </main>
  );
}
