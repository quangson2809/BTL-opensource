import { LoadingState } from "@/components/loading-state";

export default function Loading() {
  return (
    <main className="workspace-page">
      <section className="page-content">
        <LoadingState label="Đang tải dữ liệu, vui lòng chờ…" />
      </section>
    </main>
  );
}
