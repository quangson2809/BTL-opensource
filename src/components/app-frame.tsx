"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";

type NavigationItem = {
  href: string;
  label: string;
  description: string;
  roles?: readonly ("ADMIN" | "DM" | "UM" | "SA")[];
};

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Tổng quan", description: "Dashboard" },
  { href: "/customers", label: "Khách hàng", description: "Quản lý khách hàng" },
  { href: "/activities", label: "Hoạt động", description: "Lịch sử kinh doanh" },
  {
    href: "/personnel",
    label: "Nhân sự",
    description: "Cây nhân sự",
    roles: ["DM", "UM"],
  },
  { href: "/notifications", label: "Thông báo", description: "Thông báo nội bộ" },
  { href: "/reports", label: "Báo cáo", description: "Báo cáo và thống kê" },
  {
    href: "/admin/accounts",
    label: "Quản trị",
    description: "Quản trị tài khoản",
    roles: ["ADMIN"],
  },
];

const workspacePrefixes = [
  "/dashboard",
  "/customers",
  "/activities",
  "/personnel",
  "/notifications",
  "/reports",
  "/admin",
  "/password/change",
];

const routeLabels: Record<string, string> = {
  dashboard: "Tổng quan",
  customers: "Khách hàng",
  activities: "Hoạt động",
  personnel: "Nhân sự",
  notifications: "Thông báo",
  reports: "Báo cáo",
  admin: "Quản trị",
  accounts: "Tài khoản",
  roles: "Vai trò và quyền",
  new: "Tạo mới",
  edit: "Chỉnh sửa",
  change: "Đổi mật khẩu",
};

function isWorkspacePath(pathname: string) {
  return workspacePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppFrame({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [accountName, setAccountName] = useState("Tài khoản");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountLoaded, setAccountLoaded] = useState(false);
  const showWorkspace = isWorkspacePath(pathname);

  useEffect(() => {
    if (!showWorkspace) return;

    let cancelled = false;

    async function loadAccountContext() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        if (!cancelled) setAccountLoaded(true);
        return;
      }

      const [accountResult, adminResult, dmResult, umResult, saResult] =
        await Promise.all([
          supabase
            .from("tai_khoan")
            .select("ho_ten,email")
            .eq("id", user.id)
            .maybeSingle(),
          supabase.rpc("has_role", { role_code: "ADMIN" }),
          supabase.rpc("has_role", { role_code: "DM" }),
          supabase.rpc("has_role", { role_code: "UM" }),
          supabase.rpc("has_role", { role_code: "SA" }),
        ]);

      if (cancelled) return;

      if (accountResult.data) {
        setAccountName(accountResult.data.ho_ten);
        setAccountEmail(accountResult.data.email);
      }

      const nextRoles = new Set<string>();
      if (adminResult.data === true) nextRoles.add("ADMIN");
      if (dmResult.data === true) nextRoles.add("DM");
      if (umResult.data === true) nextRoles.add("UM");
      if (saResult.data === true) nextRoles.add("SA");
      setRoles(nextRoles);
      setAccountLoaded(true);
    }

    void loadAccountContext();

    return () => {
      cancelled = true;
    };
  }, [showWorkspace]);

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [pathname]);

  if (!showWorkspace) return children;

  const visibleNavigation = navigation.filter(
    (item) => !item.roles || item.roles.some((role) => roles.has(role)),
  );
  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => routeLabels[segment] ?? segment);

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-main">
        Bỏ qua điều hướng
      </a>

      <aside
        aria-label="Điều hướng ứng dụng"
        className={`workspace-sidebar${mobileNavigationOpen ? " is-open" : ""}`}
      >
        <Link aria-label="IDAILY - Tổng quan" className="workspace-brand" href="/dashboard">
          <span aria-hidden="true" className="brand-mark">iD</span>
          <span>
            <span className="brand-name">IDAILY</span>
            <span className="brand-caption">Không gian làm việc</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="workspace-navigation">
          <p className="navigation-label">KHÔNG GIAN LÀM VIỆC</p>
          {visibleNavigation.map((item) => (
            <Link
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              className={`navigation-link${isActivePath(pathname, item.href) ? " is-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              <span>{item.label}</span>
              <span aria-hidden="true" className="navigation-arrow">›</span>
            </Link>
          ))}
        </nav>

        <div className="workspace-sidebar-footer">
          <span className="account-initial" aria-hidden="true">
            {accountName.trim().charAt(0).toLocaleUpperCase("vi-VN") || "T"}
          </span>
          <span className="account-summary">
            <strong>{accountName}</strong>
            <span>{accountLoaded ? accountEmail : "Đang tải tài khoản…"}</span>
          </span>
        </div>
      </aside>

      {mobileNavigationOpen ? (
        <button
          aria-label="Đóng điều hướng"
          className="workspace-backdrop"
          onClick={() => setMobileNavigationOpen(false)}
          type="button"
        />
      ) : null}

      <div className="workspace-main-column">
        <header className="workspace-topbar">
          <button
            aria-expanded={mobileNavigationOpen}
            aria-label={mobileNavigationOpen ? "Đóng menu" : "Mở menu"}
            className="workspace-menu-toggle"
            onClick={() => setMobileNavigationOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">☰</span>
          </button>

          <div className="workspace-breadcrumbs" aria-label="Vị trí hiện tại">
            <Link href="/dashboard">IDAILY</Link>
            {breadcrumbs.map((label, index) => (
              <span key={`${label}-${index}`}>
                <span aria-hidden="true">/</span>
                <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>
                  {label}
                </span>
              </span>
            ))}
          </div>

          <div className="workspace-account-actions">
            <Link href="/password/change">Đổi mật khẩu</Link>
            <form action={logout}>
              <button type="submit" className="workspace-logout">Đăng xuất</button>
            </form>
          </div>
        </header>

        <div className="workspace-content" id="workspace-main">
          {children}
        </div>
        <footer className="workspace-footer">
          IDAILY <span aria-hidden="true">·</span> Hệ thống quản lý đại lý bảo hiểm
        </footer>
      </div>
    </div>
  );
}
