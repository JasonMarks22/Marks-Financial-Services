"use client";

/**
 * Non-blocking "save this scenario" affordance shown in each calculator's
 * results area. It never gates anything:
 *
 *   - Logged OUT → subtle "Log in to save this scenario" link to /login.
 *   - Logged IN, no `onSave` handler → visible placeholder button (that
 *     calculator's real saving isn't built yet).
 *   - Logged IN, with `onSave`   → clicking asks for a scenario name inline,
 *     calls the handler, and shows a clear success/error message.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

const NAVY = "#002E5D";

interface SaveAffordanceProps {
  /** When provided, the button performs a real save via this handler. */
  onSave?: (name: string) => Promise<{ error: string | null }>;
}

export function SaveAffordance({ onSave }: SaveAffordanceProps) {
  const { user, loading } = useAuth();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

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

  if (!onSave) {
    // TODO: wire this calculator to real persistence (like the mortgage
    // calculator's saveMortgageScenario). Deliberately does nothing yet.
    return (
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          className="rounded-full border px-4 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          Save scenario
        </button>
      </div>
    );
  }

  const save = onSave;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage(null);
    const { error } = await save(trimmed);
    setBusy(false);
    if (error) {
      setMessage({ kind: "error", text: `Couldn't save: ${error}` });
    } else {
      setMessage({ kind: "success", text: `Saved “${trimmed}”.` });
      setNaming(false);
      setName("");
    }
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      {!naming ? (
        <button
          type="button"
          onClick={() => {
            setNaming(true);
            setMessage(null);
          }}
          className="rounded-full border px-4 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          Save scenario
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-full px-4 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setNaming(false);
              setName("");
            }}
            className="text-xs text-neutral-400 hover:text-neutral-600"
          >
            Cancel
          </button>
        </form>
      )}

      {message && (
        <p
          className={`text-xs ${
            message.kind === "error" ? "text-red-600" : "text-neutral-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
