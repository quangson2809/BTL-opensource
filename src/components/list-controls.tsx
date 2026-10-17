import Link from "next/link";

type ResultSummaryProps = {
  label: string;
  total: number;
  currentPage: number;
  pageSize: number;
  hasFilters: boolean;
  clearHref: string;
};

export function ResultSummary({ label, total, currentPage, pageSize, hasFilters, clearHref }: ResultSummaryProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(total, currentPage * pageSize);
  return (
    <div className="list-summary" aria-live="polite">
      <p>{hasFilters ? "Kết quả lọc: " : "Tổng số: "}<strong>{total}</strong> {label}
        {total > 0 ? <span className="list-range"> · Hiển thị {from}–{to}</span> : null}
      </p>
      {hasFilters ? <Link href={clearHref}>Xóa bộ lọc</Link> : null}
    </div>
  );
}

type ListPaginationProps = {
  basePath: string;
  currentPage: number;
  pageCount: number;
  params: Record<string, string | undefined>;
};

export function ListPagination({ basePath, currentPage, pageCount, params }: ListPaginationProps) {
  if (pageCount <= 1) return null;
  function pageHref(page: number) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) next.set(key, value);
    next.set("page", String(page));
    return basePath + "?" + next.toString();
  }
  return (
    <nav aria-label="Phân trang kết quả" className="pagination">
      <span>Trang {currentPage}/{pageCount}</span>
      <div className="pagination-actions">
        {currentPage > 1 ? <Link href={pageHref(currentPage - 1)} rel="prev">Trước</Link> : <span aria-disabled="true" className="pagination-disabled">Trước</span>}
        {currentPage < pageCount ? <Link href={pageHref(currentPage + 1)} rel="next">Tiếp</Link> : <span aria-disabled="true" className="pagination-disabled">Tiếp</span>}
      </div>
    </nav>
  );
}
