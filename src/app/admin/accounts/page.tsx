import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ListPagination, ResultSummary } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

type AccountsPageProps = {
  searchParams: Promise<{ error?: string; q?: string; trang_thai?: string; page?: string }>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: accounts, error } = await supabase
    .from("tai_khoan")
    .select("id,ho_ten,email,ma_dai_ly,trang_thai,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Không thể tải danh sách tài khoản.");
  }

  const allAccounts = accounts ?? [];
  const search = (params.q ?? "").trim().toLocaleLowerCase("vi");
  const filteredAccounts = allAccounts.filter((account) => {
    const matchesSearch = !search ||
      account.ho_ten.toLocaleLowerCase("vi").includes(search) ||
      account.email.toLocaleLowerCase("vi").includes(search) ||
      account.ma_dai_ly.toLocaleLowerCase("vi").includes(search);
    return matchesSearch && (!params.trang_thai || account.trang_thai === params.trang_thai);
  });
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount);
  const visibleAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filterParams = { q: params.q, trang_thai: params.trang_thai };
  const hasFilters = Object.values(filterParams).some((value) => Boolean(value?.trim()));
  const accountStatuses = Array.from(new Set(allAccounts.map((account) => account.trang_thai)));

  return (
    <main>
      <section className="page-content">
        <PageHeader title="Quản trị tài khoản" description="Tra cứu tài khoản, kiểm tra trạng thái và mở hồ sơ quản trị." actions={<Link className="button-link" href="/admin/roles">Vai trò & quyền</Link>} />

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
            <select defaultValue={params.trang_thai ?? ""} name="trang_thai">
              <option value="">Tất cả trạng thái</option>
              {accountStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>
        <ResultSummary label="tài khoản" total={filteredAccounts.length} currentPage={currentPage} pageSize={pageSize} hasFilters={hasFilters} clearHref="/admin/accounts" />
        <div className="stack">
          {filteredAccounts.length === 0 ? (
            <EmptyState title={allAccounts.length === 0 ? "Chưa có tài khoản" : "Không tìm thấy kết quả"} description={allAccounts.length === 0 ? "Tài khoản sẽ xuất hiện khi được tạo trong hệ thống." : "Thử thay đổi từ khóa hoặc xóa bộ lọc để xem kết quả khác."} />
          ) : null}
          {visibleAccounts.map((account) => (
            <article className="record-row" key={account.id}>
              <p>
                <strong>{account.ho_ten}</strong>
              </p>
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
