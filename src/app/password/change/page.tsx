import Link from "next/link";
import { GuardedForm } from "@/components/guarded-form";

import { PendingSubmitButton } from "@/components/pending-submit-button";
import { requireActiveBusinessAccount } from "@/lib/business";

import {
  changePassword,
  requestPasswordChangeOtp,
} from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập đầy đủ OTP và mật khẩu mới.",
  mismatch: "Mật khẩu xác nhận không khớp.",
  "weak-password": "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ thường, chữ hoa và số.",
  "same-password": "Mật khẩu mới phải khác mật khẩu hiện tại.",
  "otp-request": "Không thể gửi mã OTP do lỗi chưa xác định. Kiểm tra log máy chủ với mã yêu cầu nếu lỗi tiếp diễn.",
  "rate-limited": "Supabase đang giới hạn số lần gửi OTP. Hãy chờ một lúc rồi thử lại.",
  "email-not-authorized": "Email người nhận chưa được Supabase cho phép nhận thư từ SMTP mặc định. Dùng email đã được xác thực trong nhóm dự án hoặc cấu hình SMTP riêng.",
  "email-provider": "Nhà cung cấp email của Supabase không gửi được OTP. Kiểm tra cấu hình SMTP và nhật ký Auth của dự án.",
  service: "Dịch vụ xác thực chưa xử lý được yêu cầu gửi OTP. Hãy thử lại sau và kiểm tra nhật ký Auth nếu lỗi tiếp diễn.",
  otp: "OTP không hợp lệ hoặc đã hết hạn.",
  pending: "Tài khoản đang chờ phê duyệt và chưa thể đổi mật khẩu trong khu vực làm việc.",
  locked: "Tài khoản đang bị khóa. Hãy liên hệ quản trị viên.",
};

type ChangePasswordPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function ChangePasswordPage({
  searchParams,
}: ChangePasswordPageProps) {
  await requireActiveBusinessAccount();
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
          <p role="status" aria-live="polite" className="message success">
            Đã gửi OTP. Mã gồm 8 số và hết hạn sau 10 phút.
          </p>
        ) : null}
        {errorMessage ? (
          <p role="alert" aria-live="assertive" className="message error">
            {errorMessage}
          </p>
        ) : null}

        <GuardedForm action={requestPasswordChangeOtp}>
          <PendingSubmitButton pendingLabel="Đang gửi OTP…">
            Gửi OTP đổi mật khẩu
          </PendingSubmitButton>
        </GuardedForm>

        <GuardedForm action={changePassword} className="stack">
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
          <PendingSubmitButton pendingLabel="Đang cập nhật mật khẩu…">
            Đổi mật khẩu
          </PendingSubmitButton>
        </GuardedForm>

        <p className="secondary-text">
          <Link href="/dashboard">Quay lại tổng quan</Link>
        </p>
      </section>
    </main>
  );
}
