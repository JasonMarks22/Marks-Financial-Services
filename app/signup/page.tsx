"use client";

/**
 * Sign-up page. The email + password are handed directly to Supabase Auth —
 * this app never stores, logs, or inspects the password itself.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const NAVY = "#002E5D";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    // Password goes straight to Supabase — never stored or logged here.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      // Email confirmation is disabled in the Supabase project, so the user
      // is signed in immediately — send them home.
      router.push("/");
    } else {
      // Email confirmation is required: no session yet until they confirm.
      setNotice(
        "Account created! Check your email for a confirmation link, then log in.",
      );
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-sm">
        <h1
          className="text-center text-3xl font-semibold tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          Create your account
        </h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          Save your scenarios across the tools.
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
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-500"
            />
            <span className="text-xs text-neutral-400">
              At least 6 characters.
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-neutral-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full px-6 py-3 text-base font-medium text-white shadow-sm transition-colors disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {busy ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium underline underline-offset-2"
            style={{ color: "var(--accent)" }}
          >
            Log in
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
