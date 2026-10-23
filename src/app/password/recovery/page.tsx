import Link from "next/link";
import { GuardedForm } from "@/components/guarded-form";
import { FormDraftPersistence } from "@/components/form-draft-persistence";
import { PendingSubmitButton } from "@/components/pending-submit-button";

import { requestPasswordRecovery } from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập email.",
  session: "Phiên đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu OTP mới.",
  service: "Dịch vụ xác thực chưa xử lý được yêu cầu gửi OTP. Hãy thử lại sau và kiểm tra nhật ký Auth nếu lỗi tiếp diễn.",
  "rate-limited": "Supabase đang giới hạn số lần gửi OTP. Hãy chờ một lúc rồi thử lại. Thông báo này không cho biết email có tồn tại hay không.",
  "email-not-authorized": "SMTP mặc định của Supabase chưa cho phép gửi đến email này. Dùng email đã được xác thực trong nhóm dự án hoặc cấu hình SMTP riêng. Thông báo này không cho biết email có tồn tại hay không.",
  "email-provider": "Nhà cung cấp email của Supabase không gửi được OTP. Kiểm tra cấu hình SMTP và nhật ký Auth của dự án. Thông báo này không cho biết email có tồn tại hay không.",
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
