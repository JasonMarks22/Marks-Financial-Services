"use client";

/**
 * Shared app navigation, rendered on every page from the root layout.
 *
 * - Brand wordmark (home) hard left, primary nav beside it:
 *   two grouped dropdowns (Calculators, Portfolio Tools) plus direct links
 *   (Market Analysis, Learn, Pricing). Dropdowns open on click, close on
 *   Escape / focus-out / outside-click / link choice. On small screens the
 *   same groups live in a hamburger menu.
 * - Auth-aware right side via useAuth(): search icon always; Log in /
 *   Sign up when logged out; notifications (coming soon), avatar, email,
 *   My Scenarios, and Log out when logged in.
 * - On scroll the bar becomes glassy: translucent card color + backdrop
 *   blur + a soft bottom border.
 * - The active section/page is highlighted with a brand underline/bold.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { LogoutButton } from "@/components/LogoutButton";
import {
  BellIcon,
  ChevronDownIcon,
  MenuIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/icons";

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
      { href: "/tools/debt-payoff", label: "Debt Payoff" },
      { href: "/tools/retirement", label: "Retirement Projector" },
    ],
  },
  {
    label: "Portfolio Tools",
    basePaths: ["/compare", "/portfolios"],
    items: [
      { href: "/compare", label: "Compare Securities" },
      { href: "/portfolios", label: "Model & My Portfolios" },
      { href: "/portfolios/build", label: "Build Portfolio" },
      { href: "/portfolios/compare", label: "Compare & Backtest" },
    ],
  },
];

/** Direct links after the dropdowns (placeholder sections are labeled on
 *  their own pages as coming soon). */
const LINKS: NavItem[] = [
  { href: "/market-analysis", label: "Market Analysis" },
  { href: "/learn", label: "Learn" },
  { href: "/pricing", label: "Pricing" },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  // Glass effect once the page is scrolled past the top.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      className={`sticky top-0 z-40 backdrop-blur-md transition-shadow ${
        scrolled ? "border-b border-edge shadow-soft" : ""
      }`}
      style={{
        backgroundColor: scrolled
          ? "color-mix(in srgb, var(--card-bg) 78%, transparent)"
          : "var(--card-bg)",
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeMenus();
      }}
      onBlur={(e) => {
        // Close when keyboard focus leaves the nav entirely.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) closeMenus();
      }}
    >
      {/* Full-bleed bar: brand + menus clustered hard left, actions hard right. */}
      <div className="flex h-16 w-full items-center justify-between gap-4 px-6 sm:px-8">
        {/* Left cluster: brand, then the nav right beside it */}
        <div className="flex min-w-0 items-center gap-3 lg:gap-6">
          <Link
            href="/"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2.5"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white"
            >
              M
            </span>
            <span
              className="text-sm font-bold tracking-tight sm:text-base"
              style={{ color: "var(--accent)" }}
            >
              Marks Investment Analytics
            </span>
          </Link>

          {/* Desktop nav: dropdowns + direct links */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {GROUPS.map((group) => {
              const active = isGroupActive(group);
              const open = openGroup === group.label;
              return (
                <div key={group.label} className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={() => setOpenGroup(open ? null : group.label)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-card-tint ${
                      active ? "font-semibold" : "font-medium text-neutral-700"
                    }`}
                    style={active ? { color: "var(--accent)" } : undefined}
                  >
                    {group.label}
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      />
                    )}
                  </button>
                  {open && (
                    <div
                      role="menu"
                      className="absolute left-0 top-full z-50 mt-2 w-60 rounded-2xl border border-edge bg-card py-2 shadow-lifted"
                    >
                      {group.items.map((item) => {
                        const itemActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            role="menuitem"
                            href={item.href}
                            onClick={closeMenus}
                            className={`block px-4 py-2 text-sm hover:bg-card-tint ${
                              itemActive ? "font-semibold" : "text-neutral-700"
                            }`}
                            style={
                              itemActive
                                ? { color: "var(--accent)" }
                                : undefined
                            }
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

            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenus}
                  className={`relative rounded-lg px-3 py-2 text-sm transition-colors hover:bg-card-tint ${
                    active ? "font-semibold" : "font-medium text-neutral-700"
                  }`}
                  style={active ? { color: "var(--accent)" } : undefined}
                >
                  {link.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right cluster: search + auth area (desktop) + hamburger */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Link
            href="/#search"
            onClick={closeMenus}
            aria-label="Search tools and securities"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-card-tint hover:text-link"
          >
            <SearchIcon className="h-[18px] w-[18px]" />
          </Link>

          {loading ? (
            <div className="h-9 w-32" />
          ) : user ? (
            <>
              <span
                title="Notifications — coming soon"
                aria-label="Notifications — coming soon"
                className="flex h-9 w-9 cursor-default items-center justify-center rounded-full text-neutral-400"
              >
                <BellIcon className="h-[18px] w-[18px]" />
              </span>
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
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-link"
              >
                {(user.email ?? "?").charAt(0).toUpperCase()}
              </span>
              <span className="max-w-36 truncate text-sm text-neutral-500">
                {user.email}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-card-tint hover:text-link"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-px hover:bg-secondary hover:shadow-lifted"
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
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-edge text-neutral-700 lg:hidden"
        >
          {mobileOpen ? (
            <XIcon className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu: same grouped links + direct links + auth */}
      {mobileOpen && (
        <div className="border-t border-edge bg-card px-6 pb-5 lg:hidden">
          {GROUPS.map((group) => (
            <div key={group.label} className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {group.label}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  className={`block rounded-lg px-2 py-2 text-sm hover:bg-card-tint ${
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

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Explore
            </p>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenus}
                className={`block rounded-lg px-2 py-2 text-sm hover:bg-card-tint ${
                  pathname === link.href ? "font-semibold" : "text-neutral-700"
                }`}
                style={
                  pathname === link.href
                    ? { color: "var(--accent)" }
                    : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-5 border-t border-edge pt-4">
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
                  className="flex-1 rounded-full border border-edge px-4 py-2 text-center text-sm font-medium text-neutral-700"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMenus}
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-white"
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
