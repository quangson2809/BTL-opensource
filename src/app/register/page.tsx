import Link from "next/link";

import { register } from "@/app/auth/actions";

const errorMessages: Record<string, string> = {
  missing: "Vui lòng điền đầy đủ thông tin bắt buộc.",
  registration: "Không thể đăng ký tài khoản. Hãy kiểm tra thông tin và thử lại.",
  "weak-password": "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ thường, chữ hoa và số.",
};

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <main>
      <section className="card auth-card">
        <h1>Đăng ký đại lý SA</h1>
        <p className="secondary-text">
          Tài khoản mới sẽ ở trạng thái chờ phê duyệt cho tới khi quản trị viên kích hoạt.
        </p>
        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

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
    </main>
  );
}
