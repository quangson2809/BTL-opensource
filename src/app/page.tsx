import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

const features = [
  {
    number: "01",
    title: "Quản lý khách hàng",
    description:
      "Tập trung thông tin khách hàng, hỗ trợ tra cứu và theo dõi dữ liệu trong phạm vi được phân quyền.",
  },
  {
    number: "02",
    title: "Theo dõi hoạt động",
    description:
      "Ghi nhận hoạt động kinh doanh và xem lịch sử theo quyền truy cập của từng tài khoản.",
  },
  {
    number: "03",
    title: "Kết nối đội ngũ",
    description:
      "Tra cứu nhân sự theo cây quản lý, theo dõi thông báo và xem báo cáo phù hợp với vai trò.",
  },
];

export default function Home() {
  return (
    <main className="home-main">
      <div className="home-shell">
        <PublicHeader mode="landing" />

        <section aria-labelledby="hero-title" className="hero">
          <div>
            <p className="eyebrow">Nền tảng quản lý đại lý</p>
            <h1 id="hero-title">
              Quản lý rõ ràng.
              <br />
              <span>Kết nối hiệu quả.</span>
            </h1>
            <p className="hero-copy">
              IDAILY hỗ trợ đội ngũ kinh doanh bảo hiểm quản lý khách hàng,
              hoạt động và thông tin nội bộ trong một không gian làm việc thống nhất.
            </p>
            <div className="hero-actions">
              <Link className="button-link" href="/login">
                Đăng nhập hệ thống <span aria-hidden="true">→</span>
              </Link>
              <Link className="button-link secondary" href="/register">
                Đăng ký tài khoản SA
              </Link>
            </div>
          </div>

          <div aria-hidden="true" className="hero-art">
            <div className="hero-orbit">
              <span className="orbit-dot one" />
              <span className="orbit-dot two" />
              <span className="hero-emblem">iD</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="features-title" className="feature-section">
          <div className="section-heading">
            <p className="eyebrow">Không gian làm việc</p>
            <h2 id="features-title">Tập trung vào công việc quan trọng</h2>
            <p>
              Các chức năng hiển thị và dữ liệu có thể truy cập phụ thuộc vào
              trạng thái tài khoản và vai trò được cấp.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <span aria-hidden="true" className="feature-number">
                  {feature.number}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="site-footer">
          <span>IDAILY · Hệ thống quản lý đại lý bảo hiểm</span>
          <span>Truy cập an toàn theo vai trò</span>
        </footer>
      </div>
    </main>
  );
}
