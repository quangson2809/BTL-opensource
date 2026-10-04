import Link from "next/link";

import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
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
      <section className="card">
        <h1>Vai trò & quyền</h1>
        <div className="actions">
          <Link href="/admin/accounts">Tài khoản</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>

        <div className="stack">
          {(roleResult.data ?? []).map((role) => {
            const rolePermissions = mappings
              .filter((mapping) => mapping.vai_tro_id === role.id)
              .map((mapping) =>
                permissions.find((permission) => permission.id === mapping.quyen_id),
              )
              .filter((permission) => permission !== undefined);

            return (
              <article className="card" key={role.id}>
                <p>
                  <strong>{role.ma_vai_tro}</strong> — {role.ten_vai_tro}
                </p>
                <p>{role.mo_ta ?? "Không có mô tả."}</p>
                <p className="secondary-text">
                  Quyền:{" "}
                  {rolePermissions.length > 0
                    ? rolePermissions
                        .map(
                          (permission) =>
                            `${permission.ma_quyen} — ${permission.ten_quyen}`,
                        )
                        .join(", ")
                    : "Không có"}
                </p>
              </article>
            );
          })}
        </div>

        <div className="stack">
          <h2>Danh sách quyền</h2>
          {permissions.map((permission) => (
            <div key={permission.id}>
              <p>
                <strong>{permission.ma_quyen}</strong> — {permission.ten_quyen}
              </p>
              <p className="secondary-text">{permission.mo_ta ?? "Không có mô tả."}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
