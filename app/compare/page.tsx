"use client";

/**
 * Securities lookup and comparison.
 *
 * Build up a list of securities (stocks / ETFs / funds) and the view adapts:
 *   - 0 selected: a lookup prompt (search + popular tickers).
 *   - 1 selected: the full <SecurityDetail> deep-dive for that one security.
 *   - 2+ selected: a normalized performance chart (one line each) plus a
 *     side-by-side comparison table (one column each).
 *
 * All market data flows through the app's server-side API routes
 * (/api/search, /api/security, /api/history); the browser never talks to the
 * provider directly. Fields the provider doesn't supply arrive as null and
 * render as "Not available" — nothing is ever fabricated.
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
  SecurityDetail as SecurityDetailData,
} from "@/lib/marketData/types";
import { HISTORY_RANGES } from "@/lib/marketData/types";
import { SecurityDetail } from "@/components/SecurityDetail";
import { ScenarioManager } from "@/components/ScenarioManager";
import { securityTypeLabel } from "@/lib/marketData/securityType";
import {
  similarityScore,
  SIMILARITY_DISCLAIMER,
} from "@/lib/funds/similarity";
import { Disclaimer } from "@/components/ui/Disclaimer";

const MAX_SECURITIES = 5;

// Distinct line colors for up to five series (first is the brand green).
const SERIES_COLORS = ["#1B4332", "#2563EB", "#C2410C", "#7C3AED", "#0D9488"];

const POPULAR = ["VOO", "SPY", "AAPL", "SCHD", "QQQ", "VTI"];

function fmtPrice(value: number, currency: string): string {
  try {
    return value.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** 2,340,000,000,000 -> "$2.34T" etc. */
function fmtMarketCap(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

// useSearchParams requires a Suspense boundary, so the page is a thin wrapper.
export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareTool />
    </Suspense>
  );
}

function CompareTool() {
  const [securities, setSecurities] = useState<SecurityDetailData[]>([]);
  const [range, setRange] = useState<HistoryRange>("1y");
  const [histories, setHistories] = useState<Record<string, PriceHistory>>({});
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Deep link: /compare?symbols=VOO,SPY,AAPL (legacy ?a=&b= still supported).
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;

    const fromSymbols = searchParams.get("symbols");
    const legacy = [searchParams.get("a"), searchParams.get("b")]
      .filter((s): s is string => Boolean(s))
      .join(",");
    const raw = fromSymbols ?? legacy;
    const wanted = [
      ...new Set(
        raw
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      ),
    ].slice(0, MAX_SECURITIES);
    if (wanted.length === 0) return;

    (async () => {
      const loaded: SecurityDetailData[] = [];
      for (const symbol of wanted) {
        try {
          const res = await fetch(
            `/api/security?symbol=${encodeURIComponent(symbol)}`,
          );
          const json = await res.json();
          if (res.ok) loaded.push(json);
        } catch {
          /* Skip a failed prefill; the user can still add it manually. */
        }
      }
      if (loaded.length > 0) setSecurities(loaded);
    })();
  }, [searchParams]);

  // Keep the URL in sync with the current selection (shareable links). Skip the
  // first run so it never clobbers the deep-link before it loads.
  const syncedOnce = useRef(false);
  useEffect(() => {
    if (!syncedOnce.current) {
      syncedOnce.current = true;
      return;
    }
    const url = new URL(window.location.href);
    const syms = securities.map((s) => s.symbol);
    if (syms.length > 0) url.searchParams.set("symbols", syms.join(","));
    else url.searchParams.delete("symbols");
    url.searchParams.delete("a");
    url.searchParams.delete("b");
    window.history.replaceState(null, "", url.toString());
  }, [securities]);

  // Fetch price history for every selected symbol (only needed for the 2+
  // comparison chart). All state changes happen inside the async callback.
  useEffect(() => {
    const symbols = securities.map((s) => s.symbol);
    let cancelled = false;
    (async () => {
      if (symbols.length < 2) {
        if (!cancelled) {
          setHistories({});
          setHistoryError(null);
        }
        return;
      }
      try {
        const results = await Promise.all(
          symbols.map(async (symbol) => {
            const res = await fetch(
              `/api/history?symbol=${encodeURIComponent(symbol)}&range=${range}`,
            );
            const json = await res.json();
            return { symbol, ok: res.ok, json };
          }),
        );
        if (cancelled) return;
        const map: Record<string, PriceHistory> = {};
        const failed: string[] = [];
        for (const r of results) {
          if (r.ok) map[r.symbol] = r.json;
          else failed.push(r.symbol);
        }
        setHistories(map);
        setHistoryError(
          failed.length > 0
            ? `Price history unavailable for: ${failed.join(", ")}.`
            : null,
        );
      } catch {
        if (!cancelled) {
          setHistories({});
          setHistoryError("Couldn't load price history. Try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [securities, range]);

  async function addSymbol(symbol: string) {
    const sym = symbol.trim().toUpperCase();
    setAddError(null);
    if (!sym) return;
    if (securities.some((s) => s.symbol === sym)) return; // already added
    if (securities.length >= MAX_SECURITIES) {
      setAddError(`You can compare up to ${MAX_SECURITIES} at once.`);
      return;
    }
    try {
      const res = await fetch(`/api/security?symbol=${encodeURIComponent(sym)}`);
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error ?? `Couldn't add ${sym}.`);
        return;
      }
      // Guard against duplicate resolved symbols (e.g. search alias -> same tkr).
      setSecurities((prev) =>
        prev.some((s) => s.symbol === json.symbol) ? prev : [...prev, json],
      );
    } catch {
      setAddError(`Couldn't add ${sym}.`);
    }
  }

  function removeSymbol(symbol: string) {
    setSecurities((prev) => prev.filter((s) => s.symbol !== symbol));
    setAddError(null);
  }

  // Snapshot current selection / apply a loaded scenario (used by ScenarioManager).
  const scenarioData = () => ({
    symbols: securities.map((s) => s.symbol),
    range,
  });
  async function loadScenario(d: Record<string, unknown>) {
    const loadedRange =
      typeof d.range === "string" &&
      HISTORY_RANGES.includes(d.range as HistoryRange)
        ? (d.range as HistoryRange)
        : "1y";
    setRange(loadedRange);
    const symbols = Array.isArray(d.symbols)
      ? d.symbols
          .filter((s): s is string => typeof s === "string")
          .slice(0, MAX_SECURITIES)
      : [];
    const loaded: SecurityDetailData[] = [];
    for (const sym of symbols) {
      try {
        const res = await fetch(`/api/security?symbol=${encodeURIComponent(sym)}`);
        const json = await res.json();
        if (res.ok) loaded.push(json);
      } catch {
        /* Skip a symbol that fails to load. */
      }
    }
    setSecurities(loaded);
  }

  const colorFor = (symbol: string) => {
    const i = securities.findIndex((s) => s.symbol === symbol);
    return SERIES_COLORS[i % SERIES_COLORS.length];
  };

  // Merge each series' history into one dataset, normalized to % change from
  // its own first close so different price scales compare fairly.
  const chartData = useMemo(() => {
    const withData = securities
      .map((s) => s.symbol)
      .filter((sym) => (histories[sym]?.points?.length ?? 0) > 0);
    if (withData.length < 2) return [];

    const rows = new Map<string, Record<string, number | string>>();
    for (const sym of withData) {
      const points = histories[sym].points;
      const first = points[0].close;
      if (!first) continue;
      for (const p of points) {
        const row = rows.get(p.date) ?? { date: p.date };
        row[sym] = ((p.close - first) / first) * 100;
        rows.set(p.date, row);
      }
    }
    return [...rows.values()].sort((x, y) =>
      String(x.date).localeCompare(String(y.date)),
    );
  }, [securities, histories]);

  const atMax = securities.length >= MAX_SECURITIES;

  // Similarity is shown only when exactly two securities are compared. null =
  // one of them isn't in the fund-profile map (report "not available").
  const similarity = useMemo(
    () =>
      securities.length === 2
        ? similarityScore(securities[0].symbol, securities[1].symbol)
        : undefined,
    [securities],
  );

  return (
    <main className="flex flex-1 flex-col items-center bg-surface px-6 py-14 text-ink sm:py-16">
      <div className="w-full max-w-6xl">
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
          Look up &amp; compare securities
        </h1>
        <p className="mt-2 text-neutral-600">
          Search any stock, ETF, or fund to see its details, or add several to
          compare them side by side.
        </p>

        {/* Add + current selection */}
        <div className="mt-8 rounded-2xl border border-edge bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <AddSecurity onAdd={addSymbol} disabled={atMax} />
              {addError && (
                <p className="mt-2 text-xs text-red-600">{addError}</p>
              )}
              {atMax && (
                <p className="mt-2 text-xs text-neutral-500">
                  Maximum of {MAX_SECURITIES} reached. Remove one to add another.
                </p>
              )}
            </div>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as HistoryRange)}
              aria-label="Chart range"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
            >
              {HISTORY_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Selected chips */}
          {securities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {securities.map((s) => {
                const up = s.change >= 0;
                return (
                  <span
                    key={s.symbol}
                    className="inline-flex items-center gap-2 rounded-full border border-edge bg-card-tint px-3 py-1.5 text-sm"
                  >
                    {securities.length >= 2 && (
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colorFor(s.symbol) }}
                      />
                    )}
                    <span className="font-semibold text-ink">{s.symbol}</span>
                    <span className="tabular-nums text-muted">
                      {fmtPrice(s.price, s.currency)}
                    </span>
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        up ? "text-link" : "text-red-600"
                      }`}
                    >
                      {up ? "+" : ""}
                      {s.changePercent.toFixed(2)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSymbol(s.symbol)}
                      aria-label={`Remove ${s.symbol}`}
                      className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-edge hover:text-ink"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* View adapts to how many are selected */}
        {securities.length === 0 ? (
          <EmptyState onAdd={addSymbol} />
        ) : securities.length === 1 ? (
          <div className="mt-8">
            <SecurityDetail ticker={securities[0].symbol} showActions={false} />
            <p className="mt-6 text-sm text-muted">
              Add another security above to compare it against{" "}
              <span className="font-semibold text-ink">
                {securities[0].symbol}
              </span>
              .
            </p>
          </div>
        ) : (
          <>
            {/* Performance chart */}
            <div className="mt-8 rounded-2xl border border-edge bg-card p-6 shadow-soft">
              <h2 className="text-lg font-bold text-ink">Relative performance</h2>
              <p className="mt-1 text-xs text-muted">
                Each line is % change from its own price at the start of the
                range, so securities at different prices compare fairly.
              </p>

              {historyError ? (
                <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {historyError}
                </p>
              ) : chartData.length === 0 ? (
                <p className="mt-6 text-center text-sm text-muted">
                  Loading history…
                </p>
              ) : (
                <div className="mt-4 h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                      <XAxis
                        dataKey="date"
                        stroke="var(--muted)"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                        minTickGap={60}
                      />
                      <YAxis
                        stroke="var(--muted)"
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
                      {securities.map((s) => (
                        <Line
                          key={s.symbol}
                          type="monotone"
                          dataKey={s.symbol}
                          name={s.symbol}
                          stroke={colorFor(s.symbol)}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Comparison table */}
            <ComparisonTable securities={securities} colorFor={colorFor} />

            {/* Similarity (exactly two securities) */}
            {securities.length === 2 && (
              <div className="mt-8 rounded-2xl border border-edge bg-card p-6 shadow-soft">
                <h2 className="text-lg font-bold text-ink">Similarity</h2>
                {!similarity ? (
                  <p className="mt-2 text-sm text-muted">
                    Similarity comparison not available for this fund.
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="text-3xl font-bold tabular-nums text-link">
                        {similarity.score}
                      </span>
                      <span className="rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold text-link">
                        {similarity.label}
                      </span>
                      <span className="text-sm text-muted">
                        {securities[0].symbol} vs {securities[1].symbol}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          What they share
                        </p>
                        <p className="mt-1 text-sm leading-6 text-neutral-700">
                          {similarity.matchingAttributes.length > 0
                            ? similarity.matchingAttributes.join(", ")
                            : "Only their asset class."}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          How they differ
                        </p>
                        <p className="mt-1 text-sm leading-6 text-neutral-700">
                          {similarity.differingAttributes.length > 0
                            ? similarity.differingAttributes.join(", ")
                            : "No differing attributes among those compared."}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-muted">
                      {SIMILARITY_DISCLAIMER}
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Save / load */}
        <div className="mt-8 flex justify-center">
          <ScenarioManager
            tool="compare"
            getData={scenarioData}
            onLoad={loadScenario}
          />
        </div>

        {/* Data source + disclaimer */}
        <div className="mt-8 space-y-2">
          <p className="text-xs leading-5 text-muted">
            Market data provided by Yahoo Finance; may be delayed or incomplete.
          </p>
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------ */

function EmptyState({ onAdd }: { onAdd: (symbol: string) => void }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-edge bg-card p-10 text-center shadow-soft">
      <p className="text-base font-semibold text-ink">
        Search for a security to get started
      </p>
      <p className="mt-1 text-sm text-muted">
        Look up one for a full breakdown, or add several to compare.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted">Popular:</span>
        {POPULAR.map((sym) => (
          <button
            key={sym}
            type="button"
            onClick={() => onAdd(sym)}
            className="rounded-full border border-edge bg-card px-3 py-1 text-sm font-medium text-neutral-700 shadow-soft transition hover:-translate-y-px hover:border-accent hover:text-link"
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function AddSecurity({
  onAdd,
  disabled,
}: {
  onAdd: (symbol: string) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const q = query.trim();

  // Debounced search; all state changes happen inside the timer callback.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      () => {
        if (q.length < 2) {
          setResults([]);
          setSearching(false);
          setError(null);
          return;
        }
        setSearching(true);
        fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then(async (res) => {
            const json = await res.json();
            if (cancelled) return;
            if (!res.ok) throw new Error(json.error ?? "Search failed");
            setResults(Array.isArray(json) ? json.slice(0, 6) : []);
            setError(null);
          })
          .catch(() => {
            if (cancelled) return;
            setResults([]);
            setError("Search failed.");
          })
          .finally(() => !cancelled && setSearching(false));
      },
      q.length < 2 ? 0 : 300,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function pick(symbol: string) {
    onAdd(symbol);
    setQuery("");
    setResults([]);
    setError(null);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          disabled ? "Maximum reached" : "Add a stock, ETF, or fund…"
        }
        aria-label="Search for a security to add"
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {searching && (
        <p className="mt-1 text-xs text-neutral-400">Searching…</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full divide-y divide-neutral-100 overflow-hidden rounded-lg border border-edge bg-card shadow-lifted">
          {results.map((r) => (
            <li key={r.symbol}>
              <button
                type="button"
                onClick={() => pick(r.symbol)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-card-tint"
              >
                <span className="truncate text-ink">
                  <strong>{r.symbol}</strong>{" "}
                  <span className="text-muted">{r.name}</span>
                </span>
                <span className="ml-2 shrink-0 text-xs text-muted">
                  {securityTypeLabel(r.type)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

const NA = (
  <span
    className="text-neutral-400"
    title="The data provider did not return this field"
  >
    Not available
  </span>
);

function ComparisonTable({
  securities,
  colorFor,
}: {
  securities: SecurityDetailData[];
  colorFor: (symbol: string) => string;
}) {
  // Each row renders per security; null results show "Not available" (either
  // the field doesn't apply to this security type, or the provider omitted it).
  const rows: {
    label: string;
    render: (d: SecurityDetailData) => string | null;
  }[] = [
    { label: "Type", render: (d) => securityTypeLabel(d.type) },
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
    <div className="mt-8 overflow-x-auto rounded-2xl border border-edge bg-card p-6 shadow-soft">
      <h2 className="text-lg font-bold text-ink">Side by side</h2>
      <table className="mt-4 w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-muted">
            <th className="py-2 pr-4 font-medium">Metric</th>
            {securities.map((s) => (
              <th key={s.symbol} className="py-2 pr-4 font-medium">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colorFor(s.symbol) }}
                  />
                  <span className="font-semibold text-ink">{s.symbol}</span>
                </span>
                <span className="block max-w-[14rem] truncate text-xs font-normal text-muted">
                  {s.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-neutral-100">
              <td className="py-2 pr-4 text-muted">{row.label}</td>
              {securities.map((s) => (
                <td
                  key={s.symbol}
                  className="py-2 pr-4 font-medium tabular-nums text-ink"
                >
                  {row.render(s) ?? NA}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
