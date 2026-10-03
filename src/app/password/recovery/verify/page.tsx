import Link from "next/link";

import { verifyRecoveryOtp } from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập email, OTP và mật khẩu mới.",
  mismatch: "Mật khẩu xác nhận không khớp.",
  "weak-password": "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ thường, chữ hoa và số.",
  "same-password": "Mật khẩu mới phải khác mật khẩu cũ.",
  otp: "OTP không hợp lệ hoặc đã hết hạn.",
  update: "Không thể cập nhật mật khẩu. Vui lòng yêu cầu OTP mới và thử lại.",
};

type VerifyRecoveryPageProps = {
  searchParams: Promise<{ email?: string; error?: string; status?: string }>;
};

export default async function VerifyRecoveryPage({
  searchParams,
}: VerifyRecoveryPageProps) {
  const params = await searchParams;
  const email = params.email ?? "";
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const otpSent = params.status === "otp-sent";

  return (
    <main>
      <section className="card auth-card">
        <h1>Xác minh OTP và đặt lại mật khẩu</h1>
        {otpSent ? (
          <p className="message success">
            Nếu email tồn tại, OTP 8 số đã được gửi và có hiệu lực 10 phút.
          </p>
        ) : null}
        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <form action={verifyRecoveryOtp} className="stack">
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={email}
              required
            />
          </label>
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
            Tối thiểu 8 ký tự, có chữ thường, chữ hoa và số. Mật khẩu mới phải khác mật khẩu cũ.
          </p>
          <button type="submit">Xác minh và đặt lại mật khẩu</button>
        </form>

        <p className="secondary-text">
          <Link href="/password/recovery">Yêu cầu OTP mới</Link>
        </p>
      </section>
    </main>
  );
}
