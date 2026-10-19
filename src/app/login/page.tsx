import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { GuardedForm } from "@/components/guarded-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import { login } from "@/app/auth/actions";
import { LOGIN_ERROR_MESSAGES } from "@/lib/auth-login-errors.mjs";

const statusMessages: Record<string, string> = {
  registered: "Đăng ký thành công. Tài khoản đang chờ quản trị viên phê duyệt.",
  "email-confirmed": "Email đã được xác minh. Tài khoản vẫn cần quản trị viên phê duyệt trước khi truy cập hệ thống.",
  "password-changed": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.",
  "password-reset": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? LOGIN_ERROR_MESSAGES[params.error] : undefined;
  const statusMessage = params.status ? statusMessages[params.status] : undefined;

  return (
    <main className="auth-main">
      <div className="auth-shell">
        <PublicHeader mode="login" />
      <section className="card auth-card auth-panel">
        <h1>Đăng nhập IDAILY</h1>
        {statusMessage ? <p role="status" aria-live="polite" className="message success">{statusMessage}</p> : null}
        {errorMessage ? <p role="alert" aria-live="assertive" className="message error">{errorMessage}</p> : null}

        <p className="form-required-note"><span aria-hidden="true">*</span> Trường bắt buộc</p>
        <GuardedForm action={login} className="stack">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <PendingSubmitButton pendingLabel="Đang đăng nhập…">Đăng nhập</PendingSubmitButton>
        </GuardedForm>

        <p className="secondary-text">
          <Link href="/password/recovery">Quên mật khẩu?</Link>
        </p>
        <p className="secondary-text">
          Chưa có tài khoản? <Link href="/register">Đăng ký SA</Link>
        </p>
      </section>
      </div>
    </main>
  );
}
