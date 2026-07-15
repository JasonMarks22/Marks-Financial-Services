"use client";

/**
 * Log-out button: signs the user out of Supabase and returns them to the
 * homepage. The AuthProvider's auth-state subscription picks up the sign-out
 * automatically, so the rest of the UI flips to logged-out state on its own.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-500 disabled:opacity-50"
    >
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
