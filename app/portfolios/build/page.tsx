"use client";

/**
 * Portfolio builder — create or edit a custom portfolio.
 *
 * Anyone can build (search securities, add holdings, watch the running total);
 * only saving needs a login, and logged-out users just see a non-blocking
 * "log in to save" link. With ?id=<portfolio id> in the URL the builder loads
 * that portfolio and saves via update instead of insert.
 *
 * Security search reuses the same /api/search route the compare page uses —
 * all provider calls stay server-side.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { MODEL_PORTFOLIOS } from "@/lib/portfolios/modelPortfolios";
import {
  getUserPortfolio,
  saveUserPortfolio,
  updateUserPortfolio,
} from "@/lib/portfolios/userPortfolios";
import type { SearchResult } from "@/lib/marketData/types";
import {
  gradePortfolio,
  type GradeResult,
  type MatchRating,
} from "@/lib/portfolios/gradePortfolio";

const ACCENT = "#1B4332";

const RATING_STYLES: Record<MatchRating, string> = {
  "Strong match": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Moderate match": "border-amber-200 bg-amber-50 text-amber-800",
  "Weak match": "border-red-200 bg-red-50 text-red-600",
};

const MATCH_DISCLAIMER =
  "This match rating is an educational estimate based on your portfolio's stock/bond/cash mix compared to common profile definitions. It is not investment advice or an authoritative assessment. Method and profile definitions are illustrative.";

// The 7 model-portfolio names double as the target-profile options.
const PROFILE_OPTIONS = MODEL_PORTFOLIOS.map((p) => p.name);

interface HoldingRow {
  id: number;
  /** Chosen ticker (or "CASH"); null while the user is still searching. */
  symbol: string | null;
  /** Display name for the chosen security. */
  label: string;
  weight: string;
}

let nextRowId = 1;

function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// useSearchParams requires a Suspense boundary, so the page itself is a thin
// wrapper around the actual builder.
export default function BuildPortfolioPage() {
  return (
    <Suspense fallback={null}>
      <PortfolioBuilder />
    </Suspense>
  );
}

function PortfolioBuilder() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { user, loading } = useAuth();

  const [name, setName] = useState("");
  const [profile, setProfile] = useState("Balanced");
  const [rows, setRows] = useState<HoldingRow[]>([
    { id: nextRowId++, symbol: null, label: "", weight: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  // Edit flow: load the existing portfolio once the auth session is known
  // (RLS only lets the owner read it). All state updates in async callbacks.
  useEffect(() => {
    if (!editId || !user) return;
    let cancelled = false;
    getUserPortfolio(editId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setMessage({
          kind: "error",
          text: error
            ? `Couldn't load portfolio: ${error}`
            : "Couldn't load portfolio: not found.",
        });
        return;
      }
      setName(data.name);
      setProfile(data.target_profile);
      setRows(
        data.holdings.map((h) => ({
          id: nextRowId++,
          symbol: h.symbol,
          label: h.symbol,
          weight: String(h.weight),
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [editId, user]);

  // Live profile-match rating: re-grades on every holdings/profile change.
  const liveGrade: GradeResult | null = useMemo(() => {
    const holdings = rows
      .filter((r) => r.symbol && toNumber(r.weight) > 0)
      .map((r) => ({ symbol: r.symbol as string, weight: toNumber(r.weight) }));
    return holdings.length > 0 ? gradePortfolio(profile, holdings) : null;
  }, [rows, profile]);

  const hasWeightedHoldings = rows.some(
    (r) => r.symbol && toNumber(r.weight) > 0,
  );

  const total = rows.reduce((sum, r) => sum + toNumber(r.weight), 0);
  const totalIs100 = Math.abs(total - 100) < 0.01;
  const rowsComplete =
    rows.length > 0 && rows.every((r) => r.symbol && toNumber(r.weight) > 0);
  const canSave = totalIs100 && rowsComplete && name.trim().length > 0 && !busy;

  function updateRow(id: number, patch: Partial<HoldingRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow(symbol: string | null = null, label = "") {
    setRows((prev) => [...prev, { id: nextRowId++, symbol, label, weight: "" }]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    setMessage(null);
    const holdings = rows.map((r) => ({
      symbol: r.symbol as string,
      weight: toNumber(r.weight),
    }));
    const { error } = editId
      ? await updateUserPortfolio(editId, name.trim(), profile, holdings)
      : await saveUserPortfolio(name.trim(), profile, holdings);
    setBusy(false);
    setMessage(
      error
        ? { kind: "error", text: `Couldn't save: ${error}` }
        : {
            kind: "success",
            text: editId ? "Portfolio updated." : `Saved “${name.trim()}”.`,
          },
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-6xl">
        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--accent)" }}
        >
          {editId ? "Edit Portfolio" : "Build a Portfolio"}
        </h1>
        <p className="mt-2 text-neutral-600">
          Pick your holdings and weights — the total must reach exactly 100%.
        </p>

        {/* Name + profile */}
        <div className="mt-8 grid grid-cols-1 gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">
              Portfolio name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My retirement mix"
              className="rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-500"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">
              Target profile
            </span>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-2 py-2.5 text-neutral-900 outline-none focus:border-neutral-500"
            >
              {PROFILE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Holdings */}
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Holdings
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addRow()}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: ACCENT }}
              >
                + Add holding
              </button>
              <button
                type="button"
                onClick={() => addRow("CASH", "Cash allocation")}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-500"
              >
                + Add cash
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {rows.map((row) => (
              <HoldingRowEditor
                key={row.id}
                row={row}
                onPick={(symbol, label) => updateRow(row.id, { symbol, label })}
                onClear={() => updateRow(row.id, { symbol: null, label: "" })}
                onWeight={(weight) => updateRow(row.id, { weight })}
                onRemove={() => removeRow(row.id)}
              />
            ))}
            {rows.length === 0 && (
              <p className="py-3 text-center text-sm text-neutral-400">
                No holdings yet — add one to get started.
              </p>
            )}
          </div>

          {/* Running total */}
          <div className="mt-5 border-t border-neutral-100 pt-4 text-right">
            <span className="text-sm text-neutral-600">Total weight: </span>
            <strong
              className={`text-lg ${totalIs100 ? "" : "text-red-600"}`}
              style={totalIs100 ? { color: "var(--accent)" } : undefined}
            >
              {total.toFixed(total % 1 === 0 ? 0 : 1)}%
            </strong>
            {!totalIs100 && (
              <p className="mt-1 text-xs text-red-600">
                {total > 100
                  ? `${(total - 100).toFixed(1)}% over — reduce weights to reach exactly 100%.`
                  : `${(100 - total).toFixed(1)}% under — allocate the rest to reach exactly 100%.`}
              </p>
            )}
          </div>
        </div>

        {/* Live profile match */}
        {hasWeightedHoldings && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Profile match
            </h2>
            {liveGrade ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${RATING_STYLES[liveGrade.rating]}`}
                  >
                    {liveGrade.rating}
                  </span>
                  <span className="text-xs text-neutral-500">
                    Target:{" "}
                    <strong className="text-neutral-700">
                      {liveGrade.statedProfile}
                    </strong>
                    {" · "}Currently reads as:{" "}
                    <strong className="text-neutral-700">
                      {liveGrade.actualProfile}
                    </strong>
                  </span>
                </div>

                <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    style={{
                      width: `${liveGrade.split.stocks}%`,
                      backgroundColor: ACCENT,
                    }}
                  />
                  <div
                    style={{
                      width: `${liveGrade.split.bonds}%`,
                      backgroundColor: "#40916C",
                    }}
                  />
                  <div
                    style={{
                      width: `${liveGrade.split.cash}%`,
                      backgroundColor: "#A8D0DB",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Stocks {Math.round(liveGrade.split.stocks)}% · Bonds{" "}
                  {Math.round(liveGrade.split.bonds)}% · Cash{" "}
                  {Math.round(liveGrade.split.cash)}%
                </p>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {liveGrade.analysis}
                </p>
                {liveGrade.unclassifiedNote && (
                  <p className="mt-1 text-xs text-amber-800">
                    {liveGrade.unclassifiedNote}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                None of the current holdings are in the app&rsquo;s asset-class
                map yet, so no rating can be shown.
              </p>
            )}
            <p className="mt-3 text-xs leading-5 text-neutral-400">
              {MATCH_DISCLAIMER}
            </p>
          </div>
        )}

        {/* Save */}
        <div className="mt-6 flex flex-col items-center gap-2">
          {loading ? null : user ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-full px-8 py-3 text-base font-medium text-white shadow-sm disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {busy
                ? "Saving…"
                : editId
                  ? "Update portfolio"
                  : "Save portfolio"}
            </button>
          ) : (
            <p className="text-sm text-neutral-500">
              <Link
                href="/login"
                className="font-medium underline underline-offset-2"
                style={{ color: "var(--accent)" }}
              >
                Log in
              </Link>{" "}
              to save this portfolio — you can keep building meanwhile.
            </p>
          )}
          {user && !canSave && !busy && (
            <p className="text-xs text-neutral-400">
              {name.trim().length === 0
                ? "Give the portfolio a name to save."
                : !rowsComplete
                  ? "Every holding needs a security and a weight above 0."
                  : !totalIs100
                    ? "Weights must total exactly 100% to save."
                    : ""}
            </p>
          )}
          {message && (
            <p
              className={`rounded-lg px-4 py-2 text-sm ${
                message.kind === "error"
                  ? "bg-red-50 text-red-600"
                  : "bg-blue-50 text-neutral-700"
              }`}
            >
              {message.text}
              {message.kind === "success" && (
                <>
                  {" "}
                  <Link
                    href="/portfolios"
                    className="font-medium underline underline-offset-2"
                    style={{ color: "var(--accent)" }}
                  >
                    View portfolios
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-500">
          For educational purposes only — not investment advice.
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------ */

function HoldingRowEditor({
  row,
  onPick,
  onClear,
  onWeight,
  onRemove,
}: {
  row: HoldingRow;
  onPick: (symbol: string, label: string) => void;
  onClear: () => void;
  onWeight: (weight: string) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced security search (same pattern as the compare page). All state
  // updates happen inside async callbacks.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Search failed.");
          setResults(json);
          setError(null);
        })
        .catch((err) => {
          setResults([]);
          setError(err instanceof Error ? err.message : "Search failed.");
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setError(null);
    }
  }

  function pick(result: SearchResult) {
    setQuery("");
    setResults([]);
    onPick(result.symbol, result.name);
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center gap-2">
        {row.symbol ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 font-medium text-neutral-900">
              {row.symbol}
            </span>
            {row.label && row.label !== row.symbol && (
              <span className="truncate text-xs text-neutral-500">
                {row.label}
              </span>
            )}
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 hover:border-neutral-500"
            >
              Change
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search name or ticker…"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500"
          />
        )}

        <div className="flex w-24 shrink-0 items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-500">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputMode="decimal"
            value={row.weight}
            placeholder="0"
            onChange={(e) => onWeight(e.target.value)}
            className="w-full bg-transparent px-1 py-2 text-right text-sm text-neutral-900 outline-none"
          />
          <span className="text-sm text-neutral-500">%</span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove holding"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:border-red-300 hover:text-red-500"
        >
          ✕
        </button>
      </div>

      {!row.symbol && (
        <>
          {(searching || error) && (
            <p
              className={`mt-2 text-xs ${error ? "text-red-600" : "text-neutral-400"}`}
            >
              {error ?? "Searching…"}
            </p>
          )}
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {results.map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    <span className="min-w-0 truncate text-neutral-900">
                      <strong>{r.symbol}</strong>{" "}
                      <span className="text-neutral-500">{r.name}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-neutral-400">
                      {r.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
