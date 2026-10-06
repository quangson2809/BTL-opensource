import Link from "next/link";

import { logout } from "@/app/auth/actions";
import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, account } = await requireBusinessAccount();
  const [adminResult, dmResult, umResult] = await Promise.all([
    supabase.rpc("has_role", { role_code: "ADMIN" }),
    supabase.rpc("has_role", { role_code: "DM" }),
    supabase.rpc("has_role", { role_code: "UM" }),
  ]);

  if (adminResult.error || dmResult.error || umResult.error) {
    throw new Error("Không thể tải quyền người dùng.");
  }

  const isAdmin = adminResult.data === true;
  const isManager = dmResult.data === true || umResult.data === true;

  return (
    <main>
      <section className="card wide-card">
        <h1>Xin chào, {account.ho_ten}</h1>
        <p>{account.email}</p>
        <p className="secondary-text">Trạng thái: {account.trang_thai}</p>

        <div className="actions">
          <Link href="/customers">Khách hàng</Link>
          <Link href="/activities">Hoạt động</Link>
          <Link href="/notifications">Thông báo</Link>
          {isManager ? <Link href="/personnel">Nhân sự</Link> : null}
          {isAdmin ? <Link href="/admin/accounts">Quản trị</Link> : null}
          <Link href="/password/change">Đổi mật khẩu</Link>
        </div>

        <form action={logout}>
          <button type="submit">Đăng xuất</button>
        </form>
      </section>
    </main>
  );
}
