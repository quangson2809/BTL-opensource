import Link from "next/link";

type ActiveFilter = {
  key: string;
  label: string;
  value: string;
};

type ResultSummaryProps = {
  label: string;
  total: number;
  currentPage: number;
  pageSize: number;
  hasFilters: boolean;
  clearHref: string;
  activeFilters?: ActiveFilter[];
  filterParams?: Record<string, string | undefined>;
};

export function ResultSummary({
  label,
  total,
  currentPage,
  pageSize,
  hasFilters,
  clearHref,
  activeFilters = [],
  filterParams = {},
}: ResultSummaryProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(total, currentPage * pageSize);

  function filterHref(removedKey: string) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(filterParams)) {
      if (key !== removedKey && key !== "page" && value) next.set(key, value);
    }
    const query = next.toString();
    return query ? clearHref + "?" + query : clearHref;
  }

  return (
    <div className="list-summary" aria-live="polite">
      <div className="list-summary-content">
        <p>
          {hasFilters ? "Kết quả lọc: " : "Tổng số: "}
          <strong>{total}</strong> {label}
          {total > 0 ? <span className="list-range"> · Hiển thị {from}–{to}</span> : null}
        </p>
        {activeFilters.length > 0 ? (
          <ul aria-label="Bộ lọc đang áp dụng" className="active-filters">
            {activeFilters.map((filter) => (
              <li className="filter-chip" key={filter.key}>
                <span>{filter.label}: <strong>{filter.value}</strong></span>
                <Link
                  aria-label={"Xóa bộ lọc " + filter.label}
                  className="filter-chip-remove"
                  href={filterHref(filter.key)}
                >
                  ×
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {hasFilters ? <Link href={clearHref}>Xóa tất cả bộ lọc</Link> : null}
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
