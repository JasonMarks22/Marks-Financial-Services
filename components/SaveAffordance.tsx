"use client";

/**
 * Non-blocking "save this scenario" affordance shown in each calculator's
 * results area. It never gates anything:
 *
 *   - Logged OUT → subtle "Log in to save this scenario" link to /login.
 *   - Logged IN  → a visible placeholder "Save scenario" button.
 *
 * TODO: wire the button to real persistence (e.g. a Supabase `scenarios`
 * table) in a future step. For now it is intentionally a no-op so the UI is
 * in place without any save logic.
 */

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

const NAVY = "#002E5D";

export function SaveAffordance() {
  const { user, loading } = useAuth();

  // During the brief initial session check, render nothing rather than
  // flashing the wrong state.
  if (loading) return null;

  if (!user) {
    return (
      <p className="mt-3 text-center text-xs text-neutral-400">
        <Link
          href="/login"
          className="font-medium text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:text-[#002E5D]"
        >
          Log in
        </Link>{" "}
        to save this scenario.
      </p>
    );
  }

  return (
    <div className="mt-3 flex justify-center">
      <button
        type="button"
        // TODO: implement real saving (persist the current inputs/results to
        // Supabase for this user). Deliberately does nothing yet.
        className="rounded-full border px-4 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50"
        style={{ borderColor: NAVY, color: NAVY }}
      >
        Save scenario
      </button>
    </div>
  );
}
