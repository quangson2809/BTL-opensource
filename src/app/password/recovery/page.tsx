import Link from "next/link";
import { GuardedForm } from "@/components/guarded-form";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import { requestPasswordRecovery } from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập email.",
  session: "Phiên đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu OTP mới.",
  "rate-limited": "Hệ thống đang giới hạn số email OTP được gửi trong thời gian ngắn. Vui lòng chờ trước khi thử lại. Nếu lỗi tiếp diễn, quản trị viên cần kiểm tra giới hạn gửi email và cấu hình SMTP. Thông báo này không xác nhận email có tồn tại trong hệ thống hay không.",
  "email-not-authorized": "Cấu hình gửi email hiện không chấp nhận yêu cầu này. Vui lòng liên hệ quản trị viên. Thông báo này không xác nhận email có tồn tại trong hệ thống hay không.",
  "redirect-invalid": "Đường dẫn xác thực chưa được cấu hình hợp lệ. Vui lòng liên hệ quản trị viên. Thông báo này không xác nhận email có tồn tại trong hệ thống hay không.",
  "email-provider": "Nhà cung cấp email chưa chấp nhận yêu cầu gửi OTP. Vui lòng chờ rồi thử lại. Thông báo này không xác nhận email có tồn tại trong hệ thống hay không.",
  service: "Chưa thể xử lý yêu cầu lúc này. Vui lòng thử lại sau. Thông báo này không xác nhận email có tồn tại trong hệ thống hay không.",
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
        {errorMessage ? <p role="alert" aria-live="assertive" className="message error">{errorMessage}</p> : null}

        <FormDraftPersistence persistKey="password-recovery" scopeKey="public-auth" hasError={Boolean(errorMessage)} />
        <GuardedForm action={requestPasswordRecovery} className="stack" data-persist-key="password-recovery">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <PendingSubmitButton pendingLabel="Đang gửi OTP…">Gửi OTP đặt lại mật khẩu</PendingSubmitButton>
        </GuardedForm>

        <p className="secondary-text">
          <Link href="/login">Quay lại đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
