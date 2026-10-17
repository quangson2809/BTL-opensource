import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ListPagination, ResultSummary } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { parsePositivePage, sanitizePostgrestOrSearch } from "@/lib/list-query.mjs";

export const dynamic = "force-dynamic";

type AccountsPageProps = {
  searchParams: Promise<{ error?: string; q?: string; trang_thai?: string; page?: string }>;
};

const accountStatuses = new Set(["CHO_PHE_DUYET", "DANG_HOAT_DONG", "KHOA"]);

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const search = sanitizePostgrestOrSearch(params.q);
  const status = accountStatuses.has(params.trang_thai ?? "") ? params.trang_thai : "";

  let countQuery = supabase
    .from("tai_khoan")
    .select("id", { count: "exact", head: true });
  if (search) {
    countQuery = countQuery.or(
      `ho_ten.ilike.%${search}%,email.ilike.%${search}%,ma_dai_ly.ilike.%${search}%`,
    );
  }
  if (status) countQuery = countQuery.eq("trang_thai", status);

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error("Không thể đếm tài khoản trong phạm vi quản trị.");
  }

  const total = count ?? 0;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(parsePositivePage(params.page), pageCount);
  const firstRow = (currentPage - 1) * pageSize;

  let accountsQuery = supabase
    .from("tai_khoan")
    .select("id,ho_ten,email,ma_dai_ly,trang_thai,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(firstRow, firstRow + pageSize - 1);
  if (search) {
    accountsQuery = accountsQuery.or(
      `ho_ten.ilike.%${search}%,email.ilike.%${search}%,ma_dai_ly.ilike.%${search}%`,
    );
  }
  if (status) accountsQuery = accountsQuery.eq("trang_thai", status);

  const { data: visibleAccounts, error } = await accountsQuery;
  if (error) {
    throw new Error("Không thể tải danh sách tài khoản.");
  }

  const filterParams = { q: params.q, trang_thai: status };
  const hasFilters = Boolean(search || status);

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Quản trị tài khoản"
          description="Tra cứu tài khoản, kiểm tra trạng thái và mở hồ sơ quản trị."
          actions={<Link className="button-link" href="/admin/roles">Vai trò & quyền</Link>}
        />

        {params.error ? (
          <p className="message error">Yêu cầu quản trị không hợp lệ.</p>
        ) : null}

        <form className="filter-grid" method="get">
          <label>
            Tìm kiếm
            <input defaultValue={params.q ?? ""} name="q" placeholder="Tên, email hoặc mã đại lý" />
          </label>
          <label>
            Trạng thái
            <select defaultValue={status} name="trang_thai">
              <option value="">Tất cả trạng thái</option>
              <option value="CHO_PHE_DUYET">Chờ phê duyệt</option>
              <option value="DANG_HOAT_DONG">Đang hoạt động</option>
              <option value="KHOA">Đã khóa</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>
        <ResultSummary label="tài khoản" total={total} currentPage={currentPage} pageSize={pageSize} hasFilters={hasFilters} clearHref="/admin/accounts" />
        <div className="stack">
          {total === 0 ? (
            <EmptyState
              title={hasFilters ? "Không tìm thấy kết quả" : "Chưa có tài khoản"}
              description={hasFilters ? "Thử thay đổi từ khóa hoặc xóa bộ lọc để xem kết quả khác." : "Tài khoản sẽ xuất hiện khi được tạo trong hệ thống."}
            />
          ) : null}
          {(visibleAccounts ?? []).map((account) => (
            <article className="record-row" key={account.id}>
              <p><strong>{account.ho_ten}</strong></p>
              <p>{account.email}</p>
              <p className="secondary-text">
                {account.ma_dai_ly} · <StatusBadge value={account.trang_thai} />
              </p>
              <p className="secondary-text">
                <Link href={`/admin/accounts/${account.id}`}>Xem chi tiết</Link>
              </p>
            </article>
          ))}
        </div>
        <ListPagination basePath="/admin/accounts" currentPage={currentPage} pageCount={pageCount} params={filterParams} />
      </section>
    </main>
  );
}
