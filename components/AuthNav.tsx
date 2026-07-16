"use client";

/**
 * Small auth-aware nav strip for the homepage:
 *   - Logged OUT → "Log in" and "Sign up" links.
 *   - Logged IN  → the user's email and a "Log out" button.
 * Reads live auth state from AuthContext, so it flips automatically.
 */

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { LogoutButton } from "@/components/LogoutButton";

const NAVY = "#002E5D";

export function AuthNav() {
  const { user, loading } = useAuth();

  // Keep layout stable (and avoid a logged-out flash) during the initial check.
  if (loading) return <div className="h-9" />;

  if (!user) {
    return (
      <div className="flex items-center justify-end gap-3">
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
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <Link
        href="/scenarios"
        className="text-sm font-medium underline-offset-2 hover:underline"
        style={{ color: "var(--accent)" }}
      >
        My scenarios
      </Link>
      <span className="text-sm text-neutral-600">{user.email}</span>
      <LogoutButton />
    </div>
  );
}
