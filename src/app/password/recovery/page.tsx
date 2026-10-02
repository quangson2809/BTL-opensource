import Link from "next/link";

import { requestPasswordRecovery } from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập email.",
  session: "Phiên đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu OTP mới.",
};

type RecoveryPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <main>
      <section className="card auth-card">
        <h1>Quên mật khẩu</h1>
        <p className="secondary-text">
          Nhập email tài khoản. Nếu tài khoản tồn tại, hệ thống sẽ gửi OTP đặt lại mật khẩu.
        </p>
        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <form action={requestPasswordRecovery} className="stack">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button type="submit">Gửi OTP đặt lại mật khẩu</button>
        </form>

        <p className="secondary-text">
          <Link href="/login">Quay lại đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
