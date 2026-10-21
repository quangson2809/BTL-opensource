import Link from "next/link";

type PublicHeaderProps = { mode: "landing" | "login" | "register" };

export function PublicHeader({ mode }: PublicHeaderProps) {
  const links =
    mode === "landing"
      ? [{ href: "/login", label: "Đăng nhập" }, { href: "/register", label: "Đăng ký đại lý" }]
      : mode === "login"
        ? [{ href: "/", label: "Trang chủ" }, { href: "/register", label: "Đăng ký đại lý" }]
        : [{ href: "/", label: "Trang chủ" }, { href: "/login", label: "Đăng nhập" }];

  return (
    <header className="site-header public-header">
      <Link aria-label="IDAILY - Trang chủ" className="brand-lockup" href="/">
        <span aria-hidden="true" className="brand-mark">iD</span>
        <span>
          <span className="brand-name">IDAILY</span>
          <span className="brand-caption">Hệ thống quản lý đại lý bảo hiểm</span>
        </span>
      </Link>
      <nav aria-label="Điều hướng chính" className="header-actions">
        {links.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
    </header>
  );
}
