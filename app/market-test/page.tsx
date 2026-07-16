"use client";

/**
 * TEMPORARY test page for the Phase 4 market-data layer.
 *
 * Proves the browser → /api/quote + /api/history → provider pipe works for a
 * single ticker. Not linked from anywhere; delete once real market features
 * exist.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  HistoryRange,
  PriceHistory,
  Quote,
} from "@/lib/marketData/types";
import { HISTORY_RANGES } from "@/lib/marketData/types";

const NAVY = "#002E5D";

export default function MarketTestPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [range, setRange] = useState<HistoryRange>("1y");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFetch(e: FormEvent) {
    e.preventDefault();
    const s = symbol.trim();
    if (!s) return;
    setBusy(true);
    setError(null);
    setQuote(null);
    setHistory(null);

    try {
      const [quoteRes, historyRes] = await Promise.all([
        fetch(`/api/quote?symbol=${encodeURIComponent(s)}`),
        fetch(`/api/history?symbol=${encodeURIComponent(s)}&range=${range}`),
      ]);

      const quoteJson = await quoteRes.json();
      const historyJson = await historyRes.json();

      if (!quoteRes.ok) throw new Error(quoteJson.error ?? "Quote failed.");
      if (!historyRes.ok) throw new Error(historyJson.error ?? "History failed.");

      setQuote(quoteJson);
      setHistory(historyJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed.");
    } finally {
      setBusy(false);
    }
  }

  const up = (quote?.change ?? 0) >= 0;

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          ← Back to home
        </Link>

        <h1
          className="mt-4 text-3xl font-semibold tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          Market Data Test
        </h1>
        <p className="mt-1 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Temporary page — verifies the Phase 4 data layer
        </p>

        <form
          onSubmit={handleFetch}
          className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Ticker (e.g. AAPL)"
            className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500"
          />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as HistoryRange)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-neutral-900 outline-none focus:border-neutral-500"
          >
            {HISTORY_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy || !symbol.trim()}
            className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {busy ? "Fetching…" : "Fetch"}
          </button>
        </form>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {quote && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">
              {quote.name} ({quote.symbol})
            </p>
            <p
              className="mt-1 text-4xl font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {quote.price.toLocaleString("en-US", {
                style: "currency",
                currency: quote.currency,
              })}
            </p>
            <p
              className={`mt-1 text-sm font-medium ${
                up ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {up ? "▲" : "▼"} {quote.change.toFixed(2)} (
              {quote.changePercent.toFixed(2)}%)
            </p>
          </div>
        )}

        {history && history.points.length > 0 && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-neutral-700">
              {history.symbol} — closing prices ({range})
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history.points}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fontSize: 11 }}
                    domain={["auto", "auto"]}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(2), "Close"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={NAVY}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
