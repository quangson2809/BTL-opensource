import { redirect } from "next/navigation";

import { resetRecoveredPassword } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập đầy đủ mật khẩu mới.",
  mismatch: "Mật khẩu xác nhận không khớp.",
  "weak-password": "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ thường, chữ hoa và số.",
  "same-password": "Mật khẩu mới phải khác mật khẩu cũ.",
  update: "Không thể cập nhật mật khẩu. Vui lòng thử lại.",
};

function recoveryAuthenticationPresent(amr: unknown) {
  return (
    Array.isArray(amr) &&
    amr.some(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "method" in entry &&
        entry.method === "recovery",
    )
  );
}

type ResetRecoveryPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetRecoveryPage({
  searchParams,
}: ResetRecoveryPageProps) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !recoveryAuthenticationPresent(claimsData?.claims?.amr)
  ) {
    redirect("/password/recovery");
  }

  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <main>
      <section className="card auth-card">
        <h1>Đặt lại mật khẩu</h1>
        <p className="secondary-text">
          Mật khẩu mới phải khác mật khẩu cũ.
        </p>
        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <form action={resetRecoveredPassword} className="stack">
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
          <button type="submit">Đặt lại mật khẩu</button>
        </form>
      </section>
    </main>
  );
}
