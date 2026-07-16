"use client";

/**
 * Log-in page. Credentials are handed directly to Supabase Auth — this app
 * never stores, logs, or inspects the password itself.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const NAVY = "#002E5D";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    // Password goes straight to Supabase — never stored or logged here.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (signInError) {
      // Supabase returns "Invalid login credentials" for bad email/password;
      // surface a friendly version but keep any other message intact.
      setError(
        signInError.message === "Invalid login credentials"
          ? "Invalid email or password."
          : signInError.message,
      );
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-sm">
        <h1
          className="text-center text-3xl font-semibold tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          Welcome back
        </h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          Log in to save and revisit your scenarios.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-500"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full px-6 py-3 text-base font-medium text-white shadow-sm transition-colors disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium underline underline-offset-2"
            style={{ color: "var(--accent)" }}
          >
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/" className="text-neutral-400 hover:text-neutral-600">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
