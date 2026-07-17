"use client";

/**
 * Compare two securities (stocks / ETFs / funds) side by side.
 *
 * All market data flows through the app's server-side API routes
 * (/api/search, /api/security, /api/history) — the browser never talks to the
 * provider directly. Fields the provider doesn't supply arrive as null and
 * render as "Not available"; nothing is ever fabricated.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CartesianGrid,
  Legend,
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
  SearchResult,
  SecurityDetail,
} from "@/lib/marketData/types";
import { HISTORY_RANGES } from "@/lib/marketData/types";

const ACCENT = "#1B4332";
const GOLD = "#2D6A4F";

const TYPE_LABELS: Record<string, string> = {
  EQUITY: "Stock",
  ETF: "ETF",
  MUTUALFUND: "Mutual fund",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function fmtPrice(value: number, currency: string): string {
  try {
    return value.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** 2,340,000,000,000 → "$2.34T" etc. */
function fmtMarketCap(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

// useSearchParams requires a Suspense boundary, so the page is a thin wrapper
// around the actual comparison tool.
export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareTool />
    </Suspense>
  );
}

function CompareTool() {
  const [a, setA] = useState<SecurityDetail | null>(null);
  const [b, setB] = useState<SecurityDetail | null>(null);
  const [range, setRange] = useState<HistoryRange>("1y");

  // Optional deep link: /compare?a=SYMBOL (and optionally &b=SYMBOL) pre-loads
  // securities via the same /api/security route the pickers use. This only
  // pre-fills the selection; all comparison logic below is unchanged.
  const searchParams = useSearchParams();
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;
    const load = async (symbol: string, set: (d: SecurityDetail) => void) => {
      try {
        const res = await fetch(
          `/api/security?symbol=${encodeURIComponent(symbol)}`,
        );
        const json = await res.json();
        if (res.ok) set(json);
      } catch {
        /* Ignore a failed prefill — the user can still pick manually. */
      }
    };
    const aParam = searchParams.get("a")?.trim();
    const bParam = searchParams.get("b")?.trim();
    if (aParam) load(aParam, setA);
    if (bParam) load(bParam, setB);
  }, [searchParams]);
  const [histories, setHistories] = useState<{
    a: PriceHistory;
    b: PriceHistory;
  } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const symbolA = a?.symbol;
  const symbolB = b?.symbol;

  // Fetch both histories whenever both securities are chosen (or the range
  // changes). All state updates happen in async callbacks.
  useEffect(() => {
    if (!symbolA || !symbolB) return;
    let cancelled = false;

    Promise.all([
      fetch(`/api/history?symbol=${encodeURIComponent(symbolA)}&range=${range}`),
      fetch(`/api/history?symbol=${encodeURIComponent(symbolB)}&range=${range}`),
    ])
      .then(async ([resA, resB]) => {
        const jsonA = await resA.json();
        const jsonB = await resB.json();
        if (cancelled) return;
        if (!resA.ok) throw new Error(jsonA.error ?? `History failed for ${symbolA}.`);
        if (!resB.ok) throw new Error(jsonB.error ?? `History failed for ${symbolB}.`);
        setHistories({ a: jsonA, b: jsonB });
        setHistoryError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setHistories(null);
        setHistoryError(err instanceof Error ? err.message : "History fetch failed.");
      });

    return () => {
      cancelled = true;
    };
  }, [symbolA, symbolB, range]);

  // Merge the two series into one chart dataset, each normalized to % change
  // from its own first close so different price scales compare fairly.
  const chartData = useMemo(() => {
    if (!histories) return [];
    const rows = new Map<string, { date: string; a?: number; b?: number }>();

    const addSeries = (points: PriceHistory["points"], key: "a" | "b") => {
      if (points.length === 0) return;
      const first = points[0].close;
      for (const p of points) {
        const row = rows.get(p.date) ?? { date: p.date };
        row[key] = ((p.close - first) / first) * 100;
        rows.set(p.date, row);
      }
    };

    addSeries(histories.a.points, "a");
    addSeries(histories.b.points, "b");
    return [...rows.values()].sort((x, y) => x.date.localeCompare(y.date));
  }, [histories]);

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-6xl">
        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--accent)" }}
        >
          Compare Two Securities
        </h1>
        <p className="mt-2 text-neutral-600">
          Search any two stocks, ETFs, or funds and see them side by side.
        </p>

        {/* Pickers */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SecurityPicker label="Security A" selected={a} onSelect={setA} />
          <SecurityPicker label="Security B" selected={b} onSelect={setB} />
        </div>

        {/* Side-by-side comparison */}
        {a && b && (
          <>
            <ComparisonTable a={a} b={b} />

            {/* Relative performance chart */}
            <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  Relative performance
                </h2>
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as HistoryRange)}
                  className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                >
                  {HISTORY_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Each line is % change from its own price at the start of the
                range, so different price scales compare fairly.
              </p>

              {historyError ? (
                <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {historyError}
                </p>
              ) : chartData.length === 0 ? (
                <p className="mt-6 text-center text-sm text-neutral-400">
                  Loading history…
                </p>
              ) : (
                <div className="mt-4 h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#dce4dd" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7a6f"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                        minTickGap={60}
                      />
                      <YAxis
                        stroke="#6b7a6f"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                        width={55}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          `${Number(value).toFixed(2)}%`,
                          name,
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="a"
                        name={a.symbol}
                        stroke={ACCENT}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="b"
                        name={b.symbol}
                        stroke={GOLD}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}

        <p className="mt-8 text-xs leading-5 text-neutral-500">
          Market data provided by Yahoo Finance; may be delayed or incomplete.
          For educational purposes only — not investment advice.
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------ */

function SecurityPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: SecurityDetail | null;
  onSelect: (detail: SecurityDetail | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search; every state update happens inside async callbacks.
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

  async function pick(result: SearchResult) {
    setResults([]);
    setQuery("");
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/security?symbol=${encodeURIComponent(result.symbol)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't load details.");
      onSelect(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load details.");
    } finally {
      setLoadingDetail(false);
    }
  }

  const up = (selected?.change ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-neutral-600">{label}</p>

      {selected ? (
        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-neutral-900">
                {selected.name}{" "}
                <span className="text-neutral-500">({selected.symbol})</span>
              </p>
              <p className="text-xs text-neutral-500">
                {typeLabel(selected.type)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="shrink-0 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-500"
            >
              Change
            </button>
          </div>
          <p
            className="mt-2 text-2xl font-semibold"
            style={{ color: "var(--accent)" }}
          >
            {fmtPrice(selected.price, selected.currency)}
          </p>
          <p
            className={`text-sm font-medium ${
              up ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {up ? "▲" : "▼"} {selected.change.toFixed(2)} (
            {selected.changePercent.toFixed(2)}%)
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search name or ticker…"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500"
          />
          {(searching || loadingDetail) && (
            <p className="mt-2 text-xs text-neutral-400">
              {loadingDetail ? "Loading details…" : "Searching…"}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {results.map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    <span className="text-neutral-900">
                      <strong>{r.symbol}</strong>{" "}
                      <span className="text-neutral-500">{r.name}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-neutral-400">
                      {typeLabel(r.type)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching &&
            !error &&
            results.length === 0 &&
            query.trim().length >= 2 && (
              <p className="mt-2 text-xs text-neutral-400">No matches.</p>
            )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

const NA = (
  <span className="text-neutral-400" title="The data provider did not return this field">
    Not available
  </span>
);

function ComparisonTable({ a, b }: { a: SecurityDetail; b: SecurityDetail }) {
  // Each row renders per security; `null` results display as "Not available"
  // (either the field doesn't apply to this security type, or the provider
  // simply didn't return it).
  const rows: { label: string; render: (d: SecurityDetail) => string | null }[] = [
    { label: "Type", render: (d) => typeLabel(d.type) },
    { label: "Price", render: (d) => fmtPrice(d.price, d.currency) },
    { label: "Day change", render: (d) => `${d.changePercent.toFixed(2)}%` },
    {
      label: "Market cap",
      render: (d) => (d.marketCap !== null ? fmtMarketCap(d.marketCap) : null),
    },
    {
      label: "P/E ratio",
      render: (d) => (d.peRatio !== null ? d.peRatio.toFixed(2) : null),
    },
    {
      label: "Dividend yield",
      render: (d) =>
        d.dividendYield !== null ? `${d.dividendYield.toFixed(2)}%` : null,
    },
    { label: "Sector", render: (d) => d.sector },
    {
      label: "Expense ratio",
      render: (d) =>
        d.expenseRatio !== null ? `${d.expenseRatio.toFixed(2)}%` : null,
    },
    { label: "Fund category", render: (d) => d.category },
    {
      label: "52-week high",
      render: (d) =>
        d.fiftyTwoWeekHigh !== null
          ? fmtPrice(d.fiftyTwoWeekHigh, d.currency)
          : null,
    },
    {
      label: "52-week low",
      render: (d) =>
        d.fiftyTwoWeekLow !== null
          ? fmtPrice(d.fiftyTwoWeekLow, d.currency)
          : null,
    },
  ];

  return (
    <div className="mt-8 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
        Side by side
      </h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-600">
            <th className="py-2 pr-4 font-medium">Metric</th>
            <th className="py-2 pr-4 font-medium">
              {a.symbol} — {a.name}
            </th>
            <th className="py-2 font-medium">
              {b.symbol} — {b.name}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const va = row.render(a);
            const vb = row.render(b);
            return (
              <tr key={row.label} className="border-b border-neutral-100">
                <td className="py-2 pr-4 text-neutral-600">{row.label}</td>
                <td className="py-2 pr-4 font-medium text-neutral-900">
                  {va ?? NA}
                </td>
                <td className="py-2 font-medium text-neutral-900">
                  {vb ?? NA}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
