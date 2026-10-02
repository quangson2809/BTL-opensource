import Link from "next/link";

import { login } from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập email và mật khẩu.",
  invalid: "Email hoặc mật khẩu không hợp lệ.",
  pending: "Tài khoản đang chờ quản trị viên phê duyệt.",
  locked: "Tài khoản đã bị quản trị viên khóa.",
  "temporary-lock": "Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau.",
  access: "Không thể cấp quyền truy cập cho tài khoản này.",
};

const statusMessages: Record<string, string> = {
  registered: "Đăng ký thành công. Tài khoản đang chờ quản trị viên phê duyệt.",
  "password-changed": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.",
  "password-reset": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const statusMessage = params.status ? statusMessages[params.status] : undefined;

  return (
    <main>
      <section className="card auth-card">
        <h1>Đăng nhập IDAILY</h1>
        {statusMessage ? <p className="message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <form action={login} className="stack">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Đăng nhập</button>
        </form>

        <p className="secondary-text">
          <Link href="/password/recovery">Quên mật khẩu?</Link>
        </p>
        <p className="secondary-text">
          Chưa có tài khoản? <Link href="/register">Đăng ký SA</Link>
        </p>
      </section>
    </main>
  );
}
