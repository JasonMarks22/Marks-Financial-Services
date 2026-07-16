"use client";

/**
 * Shared app navigation, rendered on every page from the root layout.
 *
 * - Brand link (home) on the left.
 * - Two grouped dropdowns (Calculators, Portfolio) — click to open, Escape or
 *   focus-out or outside-click to close, closed automatically when a link is
 *   chosen. On small screens the same groups live in a hamburger menu.
 * - Auth-aware right side via useAuth(): Log in / Sign up when logged out;
 *   email, My Scenarios, and Log out when logged in.
 * - The active section/page is highlighted with a navy underline/bold.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { LogoutButton } from "@/components/LogoutButton";

const NAVY = "#002E5D";

interface NavItem {
  href: string;
  label: string;
}
interface NavGroup {
  label: string;
  /** Path prefixes that mark this group as active. */
  basePaths: string[];
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Calculators",
    basePaths: ["/tools"],
    items: [
      { href: "/tools/savings-goal", label: "Savings Goal" },
      { href: "/tools/mortgage", label: "Mortgage" },
      { href: "/tools/budget", label: "Budget" },
      { href: "/tools/allocator", label: "Savings Allocator" },
    ],
  },
  {
    label: "Portfolio",
    basePaths: ["/compare", "/portfolios"],
    items: [
      { href: "/compare", label: "Compare Securities" },
      { href: "/portfolios", label: "Model & My Portfolios" },
      { href: "/portfolios/build", label: "Build Portfolio" },
      { href: "/portfolios/compare", label: "Compare & Backtest" },
    ],
  },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  // Close menus on any click outside the nav.
  useEffect(() => {
    function onDocumentClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  function closeMenus() {
    setOpenGroup(null);
    setMobileOpen(false);
  }

  const isGroupActive = (group: NavGroup) =>
    group.basePaths.some((base) => pathname.startsWith(base));

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-40 border-b border-neutral-200 bg-white"
      onKeyDown={(e) => {
        if (e.key === "Escape") closeMenus();
      }}
      onBlur={(e) => {
        // Close when keyboard focus leaves the nav entirely.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) closeMenus();
      }}
    >
      {/* Full-bleed bar: brand + menus clustered hard left, auth hard right. */}
      <div className="flex h-14 w-full items-center justify-between gap-4 px-6 sm:px-8">
        {/* Left cluster: brand, then the dropdown menus right beside it */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link
            href="/"
            onClick={closeMenus}
            className="shrink-0 text-sm font-semibold tracking-tight sm:text-base"
            style={{ color: "var(--accent)" }}
          >
            Marks Financial Services
          </Link>

          {/* Desktop dropdowns */}
          <div className="hidden items-center gap-1 md:flex">
          {GROUPS.map((group) => {
            const active = isGroupActive(group);
            const open = openGroup === group.label;
            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={open}
                  onClick={() =>
                    setOpenGroup(open ? null : group.label)
                  }
                  className={`rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-50 ${
                    active ? "font-semibold" : "font-medium text-neutral-700"
                  }`}
                  style={active ? { color: "var(--accent)" } : undefined}
                >
                  {group.label}
                  <span aria-hidden className="ml-1 text-xs text-neutral-400">
                    ▾
                  </span>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full"
                      style={{ backgroundColor: NAVY }}
                    />
                  )}
                </button>
                {open && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-neutral-200 bg-white py-1.5 shadow-lg"
                  >
                    {group.items.map((item) => {
                      const itemActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          role="menuitem"
                          href={item.href}
                          onClick={closeMenus}
                          className={`block px-4 py-2 text-sm hover:bg-neutral-50 ${
                            itemActive
                              ? "font-semibold"
                              : "text-neutral-700"
                          }`}
                          style={itemActive ? { color: "var(--accent)" } : undefined}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {/* Right cluster: auth area (desktop) + hamburger, pushed hard right */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {loading ? (
            <div className="h-8 w-24" />
          ) : user ? (
            <>
              <Link
                href="/scenarios"
                onClick={closeMenus}
                className={`text-sm underline-offset-2 hover:underline ${
                  pathname === "/scenarios" ? "font-semibold" : "font-medium"
                }`}
                style={{ color: "var(--accent)" }}
              >
                My Scenarios
              </Link>
              <span className="max-w-40 truncate text-sm text-neutral-500">
                {user.email}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-500"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full px-4 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: NAVY }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 md:hidden"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu: same grouped links + auth */}
      {mobileOpen && (
        <div className="border-t border-neutral-100 bg-white px-6 pb-4 md:hidden">
          {GROUPS.map((group) => (
            <div key={group.label} className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {group.label}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  className={`block rounded-lg px-2 py-2 text-sm hover:bg-neutral-50 ${
                    pathname === item.href
                      ? "font-semibold"
                      : "text-neutral-700"
                  }`}
                  style={
                    pathname === item.href
                      ? { color: "var(--accent)" }
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}

          <div className="mt-4 border-t border-neutral-100 pt-3">
            {loading ? null : user ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/scenarios"
                  onClick={closeMenus}
                  className="text-sm font-medium underline-offset-2 hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  My Scenarios
                </Link>
                <span className="truncate text-sm text-neutral-500">
                  {user.email}
                </span>
                <LogoutButton />
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={closeMenus}
                  className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-center text-sm font-medium text-neutral-700"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMenus}
                  className="flex-1 rounded-full px-4 py-2 text-center text-sm font-medium text-white"
                  style={{ backgroundColor: NAVY }}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
