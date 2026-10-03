import Link from "next/link";

import {
  changePassword,
  requestPasswordChangeOtp,
} from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập đầy đủ OTP và mật khẩu mới.",
  mismatch: "Mật khẩu xác nhận không khớp.",
  "weak-password": "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ thường, chữ hoa và số.",
  "same-password": "Mật khẩu mới phải khác mật khẩu hiện tại.",
  "otp-request": "Không thể gửi mã OTP. Vui lòng thử lại.",
  otp: "OTP không hợp lệ hoặc đã hết hạn.",
};

type ChangePasswordPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function ChangePasswordPage({
  searchParams,
}: ChangePasswordPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const otpSent = params.status === "otp-sent";

  return (
    <main>
      <section className="card auth-card">
        <h1>Đổi mật khẩu</h1>
        <p className="secondary-text">
          Yêu cầu mã OTP gửi tới email tài khoản, sau đó nhập OTP cùng mật khẩu mới.
        </p>

        {otpSent ? (
          <p className="message success">
            Đã gửi OTP. Mã gồm 8 số và hết hạn sau 10 phút.
          </p>
        ) : null}
        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <form action={requestPasswordChangeOtp}>
          <button type="submit">Gửi OTP đổi mật khẩu</button>
        </form>

        <form action={changePassword} className="stack">
          <label>
            OTP
            <input name="otp" inputMode="numeric" autoComplete="one-time-code" required />
          </label>
          <label>
            Mật khẩu mới
            <input name="new_password" type="password" autoComplete="new-password" required />
          </label>
          <label>
            Xác nhận mật khẩu mới
            <input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>
          <p className="secondary-text">
            Tối thiểu 8 ký tự, có chữ thường, chữ hoa và số.
          </p>
          <button type="submit">Đổi mật khẩu</button>
        </form>

        <p className="secondary-text">
          <Link href="/dashboard">Quay lại dashboard</Link>
        </p>
      </section>
    </main>
  );
}
