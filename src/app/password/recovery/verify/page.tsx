import Link from "next/link";

import { verifyRecoveryOtp } from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập email và OTP.",
  otp: "OTP không hợp lệ hoặc đã hết hạn.",
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
        <h1>Xác minh OTP khôi phục</h1>
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
          <button type="submit">Xác minh OTP</button>
        </form>

        <p className="secondary-text">
          <Link href="/password/recovery">Yêu cầu OTP mới</Link>
        </p>
      </section>
    </main>
  );
}
