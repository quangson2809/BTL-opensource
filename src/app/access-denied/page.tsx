/**
 * Trang giải thích việc truy cập bị từ chối và cung cấp đường quay về cho người dùng.
 */

import { logout } from "@/app/auth/actions";

export default function AccessDeniedPage() {
  return (
    <main>
      <section className="card">
        <h1>Không thể truy cập</h1>
        <p>Phiên đăng nhập tồn tại nhưng tài khoản hiện không đủ điều kiện sử dụng ứng dụng.</p>
        <form action={logout}>
          <button type="submit">Đăng xuất</button>
        </form>
      </section>
    </main>
  );
}
