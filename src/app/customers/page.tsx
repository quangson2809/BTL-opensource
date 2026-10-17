import Link from "next/link";

import { ActionFeedback } from "@/components/action-feedback";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ListPagination, ResultSummary } from "@/components/list-controls";

import { requireBusinessAccount } from "@/lib/business";

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

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const query = await searchParams;
  const { supabase } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("khach_hang")
    .select(
      "id,ma_khach_hang,ho_ten,so_dien_thoai,loai_khach_hang,tinh_trang,nhom_tinh_cach,updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Không thể tải danh sách khách hàng.");
  }

  const records = data ?? [];
  const search = (query.q ?? "").trim().toLocaleLowerCase("vi");
  const customers = records.filter((customer) => {
    const matchesSearch =
      !search ||
      customer.ho_ten.toLocaleLowerCase("vi").includes(search) ||
      customer.ma_khach_hang.toLocaleLowerCase("vi").includes(search) ||
      customer.so_dien_thoai.includes(search);
    const matchesType = !query.loai || customer.loai_khach_hang === query.loai;
    const matchesStatus =
      !query.tinh_trang || customer.tinh_trang === query.tinh_trang;
    const matchesGroup = !query.nhom || customer.nhom_tinh_cach === query.nhom;
    return matchesSearch && matchesType && matchesStatus && matchesGroup;
  });
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(customers.length / pageSize));
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount);
  const visibleCustomers = customers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filterParams = { q: query.q, loai: query.loai, tinh_trang: query.tinh_trang, nhom: query.nhom };
  const hasFilters = Object.values(filterParams).some((value) => Boolean(value?.trim()));

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
            <select defaultValue={query.loai ?? ""} name="loai">
              <option value="">Tất cả</option>
              <option value="MUC_TIEU">Mục tiêu</option>
              <option value="NUOI_DUONG">Nuôi dưỡng</option>
              <option value="DOI_TAC">Đối tác</option>
            </select>
          </label>
          <label>
            Tình trạng
            <select defaultValue={query.tinh_trang ?? ""} name="tinh_trang">
              <option value="">Tất cả</option>
              <option value="BẠN">BẠN</option>
              <option value="BÀN">BÀN</option>
              <option value="BÁN">BÁN</option>
              <option value="BÁM">BÁM</option>
            </select>
          </label>
          <label>
            Nhóm tính cách
            <select defaultValue={query.nhom ?? ""} name="nhom">
              <option value="">Tất cả</option>
              <option value="D">D</option>
              <option value="I">I</option>
              <option value="S">S</option>
              <option value="C">C</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>

        <ResultSummary label="khách hàng" total={customers.length} currentPage={currentPage} pageSize={pageSize} hasFilters={hasFilters} clearHref="/customers" />

        <div className="stack">
          {customers.length === 0 ? (
            <EmptyState
              actionHref={records.length === 0 ? "/customers/new" : undefined}
              actionLabel={records.length === 0 ? "Thêm khách hàng đầu tiên" : undefined}
              description={
                records.length === 0
                  ? "Thêm hồ sơ đầu tiên để bắt đầu quản lý khách hàng."
                  : "Thử thay đổi từ khóa hoặc bộ lọc để xem kết quả khác."
              }
              title={records.length === 0 ? "Chưa có khách hàng" : "Không tìm thấy kết quả"}
            />
          ) : null}
          {visibleCustomers.map((customer) => (
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
