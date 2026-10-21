import { LoadingState } from "@/components/loading-state";

export default function Loading() {
  return (
    <main>
      <section className="card wide-card">
        <LoadingState label="Đang tải trang…" />
      </section>
    </main>
  );
}
