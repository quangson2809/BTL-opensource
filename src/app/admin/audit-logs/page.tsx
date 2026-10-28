import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/admin";
import { parsePositivePage, sanitizePostgrestOrSearch } from "@/lib/list-query.mjs";

export const dynamic = "force-dynamic";

type AuditLogPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

type AuditLogRow = {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  occurred_at: string;
};

const actionLabels: Record<string, string> = {
  INSERT: "Tạo",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  LOGIN_SUCCESS: "Đăng nhập thành công",
  LOGIN_FAILURE: "Đăng nhập thất bại",
  LOGOUT: "Đăng xuất",
  AUTH_USER_CREATED: "Tạo tài khoản Auth",
  AUTH_USER_UPDATED: "Cập nhật tài khoản Auth",
};

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const search = sanitizePostgrestOrSearch(params.q);
  const pageSize = 25;
  let countQuery = supabase
    .from("nhat_ky_he_thong")
    .select("id", { count: "exact", head: true });

  if (search) countQuery = countQuery.or(`entity.ilike.%${search}%,action.ilike.%${search}%,entity_id.ilike.%${search}%`);
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error("Không thể tải nhật ký hệ thống.");

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(parsePositivePage(params.page), pageCount);
  let query = supabase
    .from("nhat_ky_he_thong")
    .select("id,actor_id,action,entity,entity_id,occurred_at")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
  if (search) query = query.or(`entity.ilike.%${search}%,action.ilike.%${search}%,entity_id.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) throw new Error("Không thể tải nhật ký hệ thống.");

  const rows = (data ?? []) as AuditLogRow[];
  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Nhật ký hệ thống"
          description="Theo dõi thao tác dữ liệu và sự kiện xác thực. Nhật ký không lưu mật khẩu, OTP, token hoặc bản sao thông tin khách hàng."
        />
        <form className="filter-grid" method="get" role="search">
          <label>
            Tìm theo đối tượng, thao tác hoặc mã bản ghi
            <input autoComplete="off" defaultValue={params.q ?? ""} name="q" placeholder="Ví dụ: tai_khoan, LOGIN_SUCCESS" />
          </label>
          <button type="submit">Tìm kiếm</button>
        </form>
        <p className="secondary-text" aria-live="polite">
          {total.toLocaleString("vi-VN")} bản ghi · Trang {currentPage}/{pageCount}
        </p>
        {rows.length === 0 ? (
          <EmptyState
            title={search ? "Không tìm thấy nhật ký phù hợp" : "Chưa có nhật ký"}
            description={search ? "Thử từ khóa khác." : "Nhật ký xuất hiện khi có thao tác dữ liệu hoặc sự kiện xác thực được ghi nhận."}
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Thời điểm</th>
                  <th scope="col">Tài khoản thực hiện</th>
                  <th scope="col">Thao tác</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Mã bản ghi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.occurred_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" })}</td>
                    <td>{row.actor_id ?? "Tác vụ hệ thống / không xác định"}</td>
                    <td>{actionLabels[row.action] ?? row.action}</td>
                    <td><code>{row.entity}</code></td>
                    <td>{row.entity_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pageCount > 1 ? (
          <nav aria-label="Phân trang nhật ký" className="actions">
            {currentPage > 1 ? <a className="button-link button-secondary" href={`/admin/audit-logs?page=${currentPage - 1}${search ? "&q=" + encodeURIComponent(search) : ""}`}>Trang trước</a> : null}
            {currentPage < pageCount ? <a className="button-link" href={`/admin/audit-logs?page=${currentPage + 1}${search ? "&q=" + encodeURIComponent(search) : ""}`}>Trang sau</a> : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
