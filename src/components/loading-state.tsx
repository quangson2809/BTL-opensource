type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Đang tải dữ liệu…" }: LoadingStateProps) {
  return (
    <section aria-label={label} aria-busy="true" className="loading-state" role="status">
      <span aria-hidden="true" className="loading-indicator" />
      <p>{label}</p>
    </section>
  );
}
