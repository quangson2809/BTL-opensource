import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="card">
        <h1>IDAILY</h1>
        <p>Hệ thống quản lý đại lý tại công ty bảo hiểm.</p>
        <div className="actions">
          <Link className="button-link" href="/login">
            Đăng nhập
          </Link>
          <Link href="/register">Đăng ký SA</Link>
        </div>
      </section>
    </main>
  );
}
