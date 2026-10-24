"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  "/profile",
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
  password: "Bảo mật",
  change: "Đổi mật khẩu",
  profile: "Hồ sơ đại lý",
};

function isWorkspacePath(pathname: string) {
  return workspacePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function isIdentifierSegment(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment);
}

function breadcrumbHref(segments: string[], index: number) {
  if (index === segments.length - 1) return undefined;

  const path = "/" + segments.slice(0, index + 1).join("/");
  const navigableRoots = [
    "/dashboard",
    "/customers",
    "/activities",
    "/personnel",
    "/notifications",
    "/reports",
    "/admin/accounts",
    "/admin/roles",
  ];

  if (navigableRoots.includes(path)) return path;
  if (/^\/(customers|activities|personnel|notifications)\/[0-9a-f-]{36}$/i.test(path)) return path;
  if (/^\/admin\/accounts\/[0-9a-f-]{36}$/i.test(path)) return path;
  return undefined;
}

export function AppFrame({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [accountName, setAccountName] = useState("Tài khoản");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [accountContextError, setAccountContextError] = useState(false);
  const [accountLoadAttempt, setAccountLoadAttempt] = useState(0);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const showWorkspace = isWorkspacePath(pathname);
  const drawerActive = showWorkspace && isMobileViewport && mobileNavigationOpen;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 46rem)");
    const updateViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
      if (!mediaQuery.matches) setMobileNavigationOpen(false);
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    const closeAccountMenuOutside = (event: PointerEvent) => {
      const menu = accountMenuRef.current;
      if (
        !menu?.open ||
        !(event.target instanceof Node) ||
        menu.contains(event.target)
      ) {
        return;
      }
      menu.open = false;
    };

    document.addEventListener("pointerdown", closeAccountMenuOutside);
    return () => document.removeEventListener("pointerdown", closeAccountMenuOutside);
  }, []);

  useEffect(() => {
    if (!showWorkspace) return;

    let cancelled = false;
    async function loadAccountContext() {
      setAccountLoaded(false);
      setRoles(new Set());

      try {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const user = userData.user;
        if (!user) {
          if (!cancelled) {
            setAccountName("Tài khoản");
            setAccountEmail("");
            setAccountContextError(false);
          }
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

        if (
          accountResult.error ||
          !accountResult.data ||
          adminResult.error ||
          dmResult.error ||
          umResult.error ||
          saResult.error
        ) {
          throw new Error("Account context unavailable");
        }

        const nextRoles = new Set<string>();
        if (adminResult.data === true) nextRoles.add("ADMIN");
        if (dmResult.data === true) nextRoles.add("DM");
        if (umResult.data === true) nextRoles.add("UM");
        if (saResult.data === true) nextRoles.add("SA");

        setAccountName(accountResult.data.ho_ten);
        setAccountEmail(accountResult.data.email);
        setRoles(nextRoles);
        setAccountContextError(false);
      } catch {
        if (!cancelled) {
          setAccountName("Tài khoản");
          setAccountEmail("");
          setRoles(new Set());
          setAccountContextError(true);
        }
      } finally {
        if (!cancelled) setAccountLoaded(true);
      }
    }

    void loadAccountContext();

    return () => {
      cancelled = true;
    };
  }, [showWorkspace, accountLoadAttempt]);

  useEffect(() => {
    if (!drawerActive) return;

    const sidebar = sidebarRef.current;
    const menuToggle = menuToggleRef.current;
    const firstFocusable = sidebar?.querySelector<HTMLElement>(
      ".workspace-sidebar-close, .workspace-navigation a[href]",
    );
    firstFocusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavigationOpen(false);
        return;
      }

      if (event.key !== "Tab" || !sidebar) return;

      const focusable = Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), summary, input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusIsOutside = !sidebar.contains(document.activeElement);

      if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || focusIsOutside)
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousBodyOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (window.matchMedia("(max-width: 46rem)").matches) {
        menuToggle?.focus();
      } else {
        document.getElementById("workspace-main")?.focus();
      }
    };
  }, [drawerActive]);

  if (!showWorkspace) return children;

  const visibleNavigation = navigation.filter(
    (item) => !item.roles || item.roles.some((role) => roles.has(role)),
  );
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbSegments = segments.filter((segment, index) => {
    const isRoleEditIdentifier =
      segments[index - 2] === "admin" &&
      segments[index - 1] === "roles" &&
      isIdentifierSegment(segment) &&
      segments[index + 1] === "edit";
    return !isRoleEditIdentifier;
  });
  const breadcrumbs = breadcrumbSegments.map((segment, index) => ({
    href: breadcrumbHref(breadcrumbSegments, index),
    key: "/" + breadcrumbSegments.slice(0, index + 1).join("/"),
    label: isIdentifierSegment(segment)
      ? "Chi tiết"
      : routeLabels[segment] ?? segment,
    current: index === breadcrumbSegments.length - 1,
  }));

  function closeAccountMenu() {
    if (accountMenuRef.current) accountMenuRef.current.open = false;
    setMobileNavigationOpen(false);
  }

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-main">
        Bỏ qua điều hướng
      </a>

      <aside
        id="workspace-sidebar"
        ref={sidebarRef}
        aria-hidden={isMobileViewport && !mobileNavigationOpen}
        aria-label="Điều hướng ứng dụng"
        aria-modal={drawerActive || undefined}
        className={"workspace-sidebar" + (mobileNavigationOpen ? " is-open" : "")}
        inert={isMobileViewport && !mobileNavigationOpen}
        role={drawerActive ? "dialog" : "complementary"}
      >
        <button
          aria-label="Đóng điều hướng"
          className="workspace-sidebar-close"
          onClick={() => setMobileNavigationOpen(false)}
          type="button"
        >
          <span aria-hidden="true">×</span>
          <span>Đóng menu</span>
        </button>

        <Link
          aria-label="IDAILY - Tổng quan"
          className="workspace-brand"
          href="/dashboard"
          onClick={() => setMobileNavigationOpen(false)}
        >
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
              className={
                "navigation-link" +
                (isActivePath(pathname, item.href) ? " is-active" : "")
              }
              href={item.href}
              key={item.href}
              onClick={() => setMobileNavigationOpen(false)}
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
          <div className="account-summary" aria-busy={!accountLoaded}>
            <strong>{accountName}</strong>
            <span
              aria-live={!accountLoaded ? "polite" : accountContextError ? "assertive" : undefined}
              className={accountContextError ? "account-context-error" : undefined}
              role={!accountLoaded ? "status" : accountContextError ? "alert" : undefined}
            >
              {!accountLoaded
                ? "Đang tải thông tin tài khoản…"
                : accountContextError
                  ? "Không thể tải thông tin tài khoản hoặc quyền truy cập."
                  : accountEmail}
            </span>
            {accountContextError ? (
              <button
                className="account-context-retry"
                disabled={!accountLoaded}
                onClick={() => setAccountLoadAttempt((attempt) => attempt + 1)}
                type="button"
              >
                {!accountLoaded ? "Đang thử lại…" : "Thử lại"}
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      {drawerActive ? (
        <button
          aria-label="Đóng điều hướng"
          className="workspace-backdrop"
          onClick={() => setMobileNavigationOpen(false)}
          type="button"
        />
      ) : null}

      <div className="workspace-main-column" inert={drawerActive}>
        <header className="workspace-topbar">
          <button
            aria-controls="workspace-sidebar"
            aria-expanded={drawerActive}
            aria-label={drawerActive ? "Đóng menu" : "Mở menu"}
            className="workspace-menu-toggle"
            onClick={() => {
              setMobileNavigationOpen((open) => !open);
              if (accountMenuRef.current) accountMenuRef.current.open = false;
            }}
            ref={menuToggleRef}
            type="button"
          >
            <span aria-hidden="true">☰</span>
          </button>

          <nav aria-label="Breadcrumb" className="workspace-breadcrumbs">
            <ol className="workspace-breadcrumb-list">
              <li><Link href="/dashboard" onClick={closeAccountMenu}>IDAILY</Link></li>
              {breadcrumbs.map((crumb) => (
                <li key={crumb.key}>
                  <span aria-hidden="true">/</span>
                  {crumb.href ? (
                    <Link href={crumb.href} onClick={closeAccountMenu}>
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={crumb.current ? "page" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="workspace-account-actions">
            <details
              className="workspace-account-menu"
              onKeyDown={(event) => {
                const menu = accountMenuRef.current;
                if (event.key !== "Escape" || !menu?.open) return;
                event.preventDefault();
                menu.open = false;
                menu.querySelector<HTMLElement>("summary")?.focus();
              }}
              ref={accountMenuRef}
            >
              <summary aria-label={"Tài khoản: " + accountName}>
                <span className="account-menu-initial" aria-hidden="true">
                  {accountName.trim().charAt(0).toLocaleUpperCase("vi-VN") || "T"}
                </span>
                <span className="account-menu-label">Tài khoản</span>
                <span aria-hidden="true" className="account-menu-chevron">⌄</span>
              </summary>
              <div className="workspace-account-menu-panel">
                <div className="account-menu-profile">
                  <strong>{accountName}</strong>
                  <span>{!accountLoaded ? "Đang tải thông tin tài khoản…" : accountContextError ? "Không thể tải thông tin tài khoản." : accountEmail}</span>
                </div>
                <Link href="/profile" onClick={closeAccountMenu}>
                  Hồ sơ đại lý
                </Link>
                <Link href="/password/change" onClick={closeAccountMenu}>
                  Đổi mật khẩu
                </Link>
                <form action={logout}>
                  <button className="workspace-logout" type="submit">
                    Đăng xuất
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>

        <div className="workspace-content" id="workspace-main" tabIndex={-1}>
          {children}
        </div>
        <footer className="workspace-footer">
          IDAILY <span aria-hidden="true">·</span> Hệ thống quản lý đại lý bảo hiểm
        </footer>
      </div>
    </div>
  );
}
