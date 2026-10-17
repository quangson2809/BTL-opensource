import Link from "next/link";

import { ActionFeedback } from "@/components/action-feedback";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ListPagination, ResultSummary } from "@/components/list-controls";

import { requireBusinessAccount } from "@/lib/business";
import { parsePositivePage, sanitizePostgrestOrSearch } from "@/lib/list-query.mjs";

export const dynamic = "force-dynamic";

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string;
    loai?: string;
    tinh_trang?: string;
    nhom?: string;
    status?: string;
    error?: string;
    page?: string;
  }>;
};

const customerTypes = new Set(["MUC_TIEU", "NUOI_DUONG", "DOI_TAC"]);
const customerStatuses = new Set(["BẠN", "BÀN", "BÁN", "BÁM"]);
const personalityGroups = new Set(["D", "I", "S", "C"]);

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const query = await searchParams;
  const { supabase } = await requireBusinessAccount();

  const search = sanitizePostgrestOrSearch(query.q);
  const type = customerTypes.has(query.loai ?? "") ? query.loai : "";
  const status = customerStatuses.has(query.tinh_trang ?? "") ? query.tinh_trang : "";
  const group = personalityGroups.has(query.nhom ?? "") ? query.nhom : "";

  let countQuery = supabase
    .from("khach_hang")
    .select("id", { count: "exact", head: true });
  if (search) {
    countQuery = countQuery.or(
      `ho_ten.ilike.%${search}%,ma_khach_hang.ilike.%${search}%,so_dien_thoai.ilike.%${search}%`,
    );
  }
  if (type) countQuery = countQuery.eq("loai_khach_hang", type);
  if (status) countQuery = countQuery.eq("tinh_trang", status);
  if (group) countQuery = countQuery.eq("nhom_tinh_cach", group);

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error("Không thể đếm khách hàng trong phạm vi được cấp quyền.");
  }

  const total = count ?? 0;
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(parsePositivePage(query.page), pageCount);
  const firstRow = (currentPage - 1) * pageSize;

  let customersQuery = supabase
    .from("khach_hang")
    .select(
      "id,ma_khach_hang,ho_ten,so_dien_thoai,loai_khach_hang,tinh_trang,nhom_tinh_cach,updated_at",
    )
    .order("updated_at", { ascending: false })
    .range(firstRow, firstRow + pageSize - 1);
  if (search) {
    customersQuery = customersQuery.or(
      `ho_ten.ilike.%${search}%,ma_khach_hang.ilike.%${search}%,so_dien_thoai.ilike.%${search}%`,
    );
  }
  if (type) customersQuery = customersQuery.eq("loai_khach_hang", type);
  if (status) customersQuery = customersQuery.eq("tinh_trang", status);
  if (group) customersQuery = customersQuery.eq("nhom_tinh_cach", group);

  const { data: customers, error } = await customersQuery;
  if (error) {
    throw new Error("Không thể tải danh sách khách hàng.");
  }

  const filterParams = { q: query.q, loai: type, tinh_trang: status, nhom: group };
  const hasFilters = Boolean(search || type || status || group);

  return (
    <main>
      <section className="card wide-card">
        <PageHeader
          actions={
            <Link className="button-link" href="/customers/new">
              Thêm khách hàng
            </Link>
          }
          description="Tra cứu và cập nhật hồ sơ khách hàng thuộc phạm vi được cấp quyền."
          title="Khách hàng của tôi"
        />

        {query.status ? <ActionFeedback status={query.status} /> : null}
        {query.error ? <ActionFeedback error={query.error} /> : null}

        <form className="filter-grid" method="get">
          <label>
            Tìm kiếm
            <input
              defaultValue={query.q ?? ""}
              name="q"
              placeholder="Tên, mã hoặc số điện thoại"
            />
          </label>
          <label>
            Loại
            <select defaultValue={type} name="loai">
              <option value="">Tất cả</option>
              <option value="MUC_TIEU">Mục tiêu</option>
              <option value="NUOI_DUONG">Nuôi dưỡng</option>
              <option value="DOI_TAC">Đối tác</option>
            </select>
          </label>
          <label>
            Tình trạng
            <select defaultValue={status} name="tinh_trang">
              <option value="">Tất cả</option>
              <option value="BẠN">BẠN</option>
              <option value="BÀN">BÀN</option>
              <option value="BÁN">BÁN</option>
              <option value="BÁM">BÁM</option>
            </select>
          </label>
          <label>
            Nhóm tính cách
            <select defaultValue={group} name="nhom">
              <option value="">Tất cả</option>
              <option value="D">D</option>
              <option value="I">I</option>
              <option value="S">S</option>
              <option value="C">C</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>

        <ResultSummary label="khách hàng" total={total} currentPage={currentPage} pageSize={pageSize} hasFilters={hasFilters} clearHref="/customers" />

        <div className="stack">
          {total === 0 ? (
            <EmptyState
              actionHref={!hasFilters ? "/customers/new" : undefined}
              actionLabel={!hasFilters ? "Thêm khách hàng đầu tiên" : undefined}
              description={
                !hasFilters
                  ? "Thêm hồ sơ đầu tiên để bắt đầu quản lý khách hàng."
                  : "Thử thay đổi từ khóa hoặc bộ lọc để xem kết quả khác."
              }
              title={!hasFilters ? "Chưa có khách hàng" : "Không tìm thấy kết quả"}
            />
          ) : null}
          {(customers ?? []).map((customer) => (
            <article className="record-row" key={customer.id}>
              <p>
                <strong>{customer.ho_ten}</strong> — {customer.ma_khach_hang}
              </p>
              <p>{customer.so_dien_thoai}</p>
              <p className="secondary-text">
                {customer.loai_khach_hang} · <StatusBadge value={customer.tinh_trang} /> · {customer.nhom_tinh_cach}
              </p>
              <p className="secondary-text">
                <Link href={"/customers/" + customer.id}>Xem chi tiết</Link>
              </p>
            </article>
          ))}
        </div>
        <ListPagination basePath="/customers" currentPage={currentPage} pageCount={pageCount} params={filterParams} />
      </section>
    </main>
  );
}
