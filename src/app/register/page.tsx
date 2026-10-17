import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

import { register } from "@/app/auth/actions";
import {
  REGISTRATION_ERROR_MESSAGES,
  REGISTRATION_STATUS_MESSAGES,
} from "@/lib/auth-registration.mjs";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const errorMessage = params.error
    ? REGISTRATION_ERROR_MESSAGES[params.error]
    : undefined;
  const statusMessage = params.status
    ? REGISTRATION_STATUS_MESSAGES[params.status]
    : undefined;

  return (
    <main className="auth-main">
      <div className="auth-shell">
        <PublicHeader mode="register" />
      <section className="card auth-card auth-panel">
        <h1>Đăng ký đại lý SA</h1>
        <p className="secondary-text">
          Tài khoản mới sẽ ở trạng thái chờ phê duyệt cho tới khi quản trị viên kích hoạt.
        </p>
        {statusMessage ? <p role="status" aria-live="polite" className="message success">{statusMessage}</p> : null}
        {errorMessage ? <p role="alert" aria-live="assertive" className="message error">{errorMessage}</p> : null}

        <p className="form-required-note"><span aria-hidden="true">*</span> Trường bắt buộc</p>
        <form action={register} className="stack">
          <label>
            Họ tên
            <input name="ho_ten" autoComplete="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Số điện thoại
            <input name="so_dien_thoai" autoComplete="tel" required />
          </label>
          <label>
            Mã đại lý
            <input name="ma_dai_ly" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" autoComplete="new-password" required />
          </label>
          <p className="secondary-text">
            Tối thiểu 8 ký tự, có chữ thường, chữ hoa và số.
          </p>
          <button type="submit">Tạo tài khoản</button>
        </form>

        <p className="secondary-text">
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </p>
      </section>
      </div>
    </main>
  );
}
