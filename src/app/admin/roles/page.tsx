import Link from "next/link";

import { PageHeader } from "@/components/page-header";

import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type RolesPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const statusMessages: Record<string, string> = {
  created: "Đã tạo vai trò.",
  updated: "Đã cập nhật vai trò và tập quyền.",
};

export default async function RolesPage({ searchParams }: RolesPageProps) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();

  const [roleResult, permissionResult, mappingResult] = await Promise.all([
    supabase
      .from("vai_tro")
      .select("id,ma_vai_tro,ten_vai_tro,mo_ta")
      .order("ma_vai_tro"),
    supabase
      .from("quyen")
      .select("id,ma_quyen,ten_quyen,mo_ta")
      .order("ma_quyen"),
    supabase
      .from("phan_quyen_vai_tro")
      .select("vai_tro_id,quyen_id"),
  ]);

  if (roleResult.error || permissionResult.error || mappingResult.error) {
    throw new Error("Không thể tải danh mục vai trò và quyền.");
  }

  const permissions = permissionResult.data ?? [];
  const mappings = mappingResult.data ?? [];

  return (
    <main>
      <section className="page-content">
        <PageHeader
          title="Vai trò & quyền"
          description="Quản lý danh mục vai trò và cấu hình permission có trong hệ thống."
          actions={
            <>
              <Link className="button-link" href="/admin/roles/new">
                Tạo vai trò
              </Link>
              <Link className="button-link button-secondary" href="/admin/accounts">
                Tài khoản
              </Link>
            </>
          }
        />
        {query.status && statusMessages[query.status] ? (
          <p aria-live="polite" className="message success" role="status">
            {statusMessages[query.status]}
          </p>
        ) : null}

        <p className="field-help">
          Mã vai trò hệ thống được giữ cố định. Danh mục quyền hiện tại do migration
          quản lý; tại đây bạn tạo/sửa vai trò và chọn các quyền đã được định nghĩa.
          Permission chỉ được áp dụng ở policy/RPC có kiểm tra permission tương ứng.
        </p>

        <section aria-labelledby="role-catalog-title" className="detail-section">
          <h2 id="role-catalog-title">Danh sách vai trò</h2>
          <div className="stack">
            {(roleResult.data ?? []).map((role) => {
              const rolePermissions = mappings
                .filter((mapping) => mapping.vai_tro_id === role.id)
                .map((mapping) =>
                  permissions.find((permission) => permission.id === mapping.quyen_id),
                )
                .filter((permission) => permission !== undefined);

              const isSystemRole = ["ADMIN", "DM", "UM", "SA"].includes(role.ma_vai_tro);

            return (
                <article className="role-assignment" key={role.id}>
                  <div>
                    <p>
                      <strong>{role.ma_vai_tro}</strong> — {role.ten_vai_tro}
                      {["ADMIN", "DM", "UM", "SA"].includes(role.ma_vai_tro) ? (
                        <span className="secondary-text"> · Vai trò hệ thống</span>
                      ) : null}
                    </p>
                    <p className="secondary-text">{role.mo_ta ?? "Không có mô tả."}</p>
                    <p>
                      <strong>Quyền:</strong>{" "}
                      {rolePermissions.length > 0
                        ? rolePermissions
                            .map((permission) => permission.ma_quyen + " — " + permission.ten_quyen)
                            .join(", ")
                        : "Không có"}
                    </p>
                  </div>
                  <div className="actions">
                    {isSystemRole ? (
                      <p className="secondary-text">
                        Vai trò hệ thống được bảo vệ; không thể sửa tại đây.
                      </p>
                    ) : (
                      <Link
                        className="button-link button-secondary"
                        href={"/admin/roles/" + role.id + "/edit"}
                      >
                        Sửa vai trò & quyền
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="permission-catalog-title" className="detail-section">
          <h2 id="permission-catalog-title">Danh mục quyền hiện có</h2>
          {(permissions ?? []).length === 0 ? (
            <p className="secondary-text">Chưa có quyền được định nghĩa trong migration.</p>
          ) : (
            <div className="stack">
              {permissions.map((permission) => (
                <article className="record-row" key={permission.id}>
                  <p>
                    <strong>{permission.ma_quyen}</strong> — {permission.ten_quyen}
                  </p>
                  <p className="secondary-text">{permission.mo_ta ?? "Không có mô tả."}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
