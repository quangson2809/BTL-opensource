import Link from "next/link";

import { FormDraftClear } from "@/components/form-draft-clear";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { permissionGroupForCode } from "@/lib/permission-groups.mjs";

import { requireAdmin } from "@/lib/admin";
import { sanitizePostgrestOrSearch } from "@/lib/list-query.mjs";

export const dynamic = "force-dynamic";

type RolesPageProps = {
  searchParams: Promise<{ status?: string; id?: string; q?: string }>;
};

const statusMessages: Record<string, string> = {
  created: "Đã tạo vai trò.",
  updated: "Đã cập nhật vai trò và tập quyền.",
};

export default async function RolesPage({ searchParams }: RolesPageProps) {
  const query = await searchParams;
  const { supabase, accountId } = await requireAdmin();
  const search = sanitizePostgrestOrSearch(query.q).toLocaleLowerCase("vi-VN");

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

  const allRoles = roleResult.data ?? [];
  const allPermissions = permissionResult.data ?? [];
  const mappings = mappingResult.data ?? [];
  const permissionsById = new Map<string, (typeof allPermissions)[number]>(
    allPermissions.map((permission) => [permission.id, permission] as const),
  );
  const permissionIdsByRole = new Map<string, Set<string>>();
  for (const mapping of mappings) {
    const ids = permissionIdsByRole.get(mapping.vai_tro_id) ?? new Set<string>();
    ids.add(mapping.quyen_id);
    permissionIdsByRole.set(mapping.vai_tro_id, ids);
  }
  const matchesSearch = (values: Array<string | null | undefined>) =>
    values.join(" ").toLocaleLowerCase("vi-VN").includes(search);
  const visibleRoles = search
    ? allRoles.filter((role) =>
        matchesSearch([role.ma_vai_tro, role.ten_vai_tro, role.mo_ta]) ||
        [...(permissionIdsByRole.get(role.id) ?? [])].some((permissionId) => {
          const permission = permissionsById.get(permissionId);
          return permission
            ? matchesSearch([permission.ma_quyen, permission.ten_quyen, permission.mo_ta])
            : false;
        }),
      )
    : allRoles;
  const permissions = search
    ? allPermissions.filter((permission) =>
        matchesSearch([permission.ma_quyen, permission.ten_quyen, permission.mo_ta]),
      )
    : allPermissions;
  type PermissionRow = (typeof permissions)[number];
  const permissionsByGroup = new Map<string, PermissionRow[]>();
  for (const permission of permissions) {
    const group = permissionGroupForCode(permission.ma_quyen);
    const rows = permissionsByGroup.get(group) ?? [];
    rows.push(permission);
    permissionsByGroup.set(group, rows);
  }

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
        <FormDraftClear scopeKey={accountId} persistKeys={["role-create", ...(query.id ? ["role-edit-" + query.id] : [])]} clearOn={query.status === "created" || query.status === "updated"} />
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

        <form className="filter-grid" method="get" role="search">
          <label>
            Tìm vai trò hoặc quyền
            <input autoComplete="off" defaultValue={query.q ?? ""} name="q" placeholder="Mã, tên hoặc mô tả" />
          </label>
          <button type="submit">Tìm kiếm</button>
          {search ? <Link className="button-link button-secondary" href="/admin/roles">Xóa tìm kiếm</Link> : null}
        </form>

        <section aria-labelledby="role-catalog-title" className="detail-section">
          <h2 id="role-catalog-title">Danh sách vai trò</h2>
          <div className="stack">
            {visibleRoles.length === 0 ? (
              <EmptyState
                title={search ? "Không tìm thấy vai trò phù hợp" : "Chưa có vai trò"}
                description={search ? "Thử từ khóa khác để tìm theo mã, tên hoặc quyền được gán." : "Tạo vai trò để bắt đầu cấu hình các quyền được cấp cho người dùng."}
              />
            ) : (
              visibleRoles.map((role) => {
              const rolePermissions = mappings
                .filter((mapping) => mapping.vai_tro_id === role.id)
                .map((mapping) =>
                  allPermissions.find((permission) => permission.id === mapping.quyen_id),
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
            })
            )}
          </div>
        </section>

        <section aria-labelledby="permission-catalog-title" className="detail-section">
          <h2 id="permission-catalog-title">Danh mục quyền hiện có</h2>
          {(permissions ?? []).length === 0 ? (
            <p className="secondary-text">{search ? "Không tìm thấy quyền phù hợp." : "Chưa có quyền được định nghĩa trong migration."}</p>
          ) : (
            <div className="stack">
              {Array.from(permissionsByGroup.entries()).map(([group, groupedPermissions]) => (
                <section aria-label={group} className="permission-catalog-group" key={group}>
                  <h3>{group}</h3>
                  <div className="stack">
                    {groupedPermissions.map((permission) => (
                      <article className="record-row" key={permission.id}>
                        <p>
                          <strong>{permission.ma_quyen}</strong> — {permission.ten_quyen}
                        </p>
                        <p className="secondary-text">{permission.mo_ta ?? "Không có mô tả."}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
