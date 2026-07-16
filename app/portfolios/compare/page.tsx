"use client";

/**
 * Portfolio comparison + backtesting.
 *
 * COMPARISON: pick any mix of your saved portfolios and the 7 model
 * portfolios; see them side by side (holdings + allocation).
 *
 * BACKTESTING: for the selected portfolios, simulate growing $10,000 over a
 * 1y/3y/5y window via POST /api/backtest (all market data stays server-side).
 * Any data-coverage warnings from the backtest are shown prominently — short
 * or missing history is surfaced, never papered over.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MODEL_PORTFOLIOS } from "@/lib/portfolios/modelPortfolios";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getUserPortfolios,
  type UserPortfolioRow,
} from "@/lib/portfolios/userPortfolios";
import type { BacktestResult } from "@/lib/portfolios/backtest";

const NAVY = "#002E5D";
const LINE_COLORS = ["#002E5D", "#B0864B", "#3E6491", "#7FA8D0", "#C6A15B", "#5E7EAB"];
const SPLIT_COLORS = { Stocks: NAVY, Bonds: "#7FA8D0", Cash: "#A9B2BD" } as const;
const HOLDING_PALETTE = ["#002E5D", "#1F4B76", "#3E6491", "#5E7EAB", "#7FA8D0", "#C6A15B", "#8DA3BC", "#B0864B"];

const BACKTEST_RANGES = ["1y", "3y", "5y"] as const;
type BacktestRange = (typeof BACKTEST_RANGES)[number];
const START_AMOUNT = 10000;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface SelectablePortfolio {
  id: string; // "model:<id>" or "user:<uuid>"
  name: string;
  profile: string;
  holdings: { symbol: string; weight: number }[];
  /** Stocks/bonds/cash split — model portfolios only. */
  split: { stocks: number; bonds: number; cash: number } | null;
  isModel: boolean;
}

export default function PortfolioComparePage() {
  const { user, loading } = useAuth();
  const [userRows, setUserRows] = useState<UserPortfolioRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [range, setRange] = useState<BacktestRange>("3y");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, BacktestResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserPortfolios().then(({ data }) => {
      if (!cancelled) setUserRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const available: SelectablePortfolio[] = useMemo(() => {
    const users: SelectablePortfolio[] = userRows.map((r) => ({
      id: `user:${r.id}`,
      name: r.name,
      profile: r.target_profile,
      holdings: r.holdings,
      split: null,
      isModel: false,
    }));
    const models: SelectablePortfolio[] = MODEL_PORTFOLIOS.map((m) => ({
      id: `model:${m.id}`,
      name: m.name,
      profile: m.profile,
      holdings: m.holdings,
      split: m.targetSplit,
      isModel: true,
    }));
    return [...users, ...models];
  }, [userRows]);

  const selected = available.filter((p) => selectedIds.includes(p.id));

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    // Selection changed → previous backtest results no longer match it.
    setResults({});
    setErrors({});
  }

  async function runBacktests() {
    if (selected.length === 0) return;
    setRunning(true);
    setResults({});
    setErrors({});

    const newResults: Record<string, BacktestResult> = {};
    const newErrors: Record<string, string> = {};

    await Promise.all(
      selected.map(async (p) => {
        try {
          const res = await fetch("/api/backtest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              holdings: p.holdings,
              range,
              startAmount: START_AMOUNT,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Backtest failed.");
          newResults[p.id] = json;
        } catch (err) {
          newErrors[p.id] =
            err instanceof Error ? err.message : "Backtest failed.";
        }
      }),
    );

    setResults(newResults);
    setErrors(newErrors);
    setRunning(false);
  }

  // Merge every portfolio's monthly series into one chart dataset.
  const chartData = useMemo(() => {
    const rows = new Map<string, Record<string, string | number>>();
    for (const [id, result] of Object.entries(results)) {
      for (const point of result.series) {
        const row = rows.get(point.date) ?? { date: point.date };
        row[id] = point.value;
        rows.set(point.date, row);
      }
    }
    return [...rows.values()].sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
  }, [results]);

  const allWarnings = selected.flatMap((p) =>
    (results[p.id]?.warnings ?? []).map((w) => `${p.name}: ${w}`),
  );

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-5xl">
        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--accent)" }}
        >
          Compare &amp; Backtest Portfolios
        </h1>
        <p className="mt-2 text-neutral-600">
          Select two or more portfolios to compare — yours and the models — then
          simulate how {usd.format(START_AMOUNT)} would have grown.
        </p>

        {/* ---- Selection ---- */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
            Choose portfolios
          </h2>

          {loading ? null : user ? (
            userRows.length > 0 ? (
              <PortfolioPills
                title="My portfolios"
                portfolios={available.filter((p) => !p.isModel)}
                selectedIds={selectedIds}
                onToggle={toggle}
              />
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                You have no saved portfolios yet —{" "}
                <Link
                  href="/portfolios/build"
                  className="font-medium underline underline-offset-2"
                  style={{ color: "var(--accent)" }}
                >
                  build one
                </Link>
                , or compare the models below.
              </p>
            )
          ) : (
            <p className="mt-3 text-sm text-neutral-500">
              <Link
                href="/login"
                className="font-medium underline underline-offset-2"
                style={{ color: "var(--accent)" }}
              >
                Log in
              </Link>{" "}
              to include your own portfolios — the models below work either way.
            </p>
          )}

          <PortfolioPills
            title="Model portfolios"
            portfolios={available.filter((p) => p.isModel)}
            selectedIds={selectedIds}
            onToggle={toggle}
          />
        </div>

        {/* ---- Side-by-side comparison ---- */}
        {selected.length >= 2 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {selected.map((p) => (
              <ComparisonCard key={p.id} portfolio={p} />
            ))}
          </div>
        ) : selected.length === 1 ? (
          <p className="mt-6 text-sm text-neutral-500">
            Select at least one more portfolio to compare side by side — or run
            the backtest on this one alone below.
          </p>
        ) : null}

        {/* ---- Backtest ---- */}
        {selected.length > 0 && (
          <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--accent)" }}
              >
                Backtest: growth of {usd.format(START_AMOUNT)}
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as BacktestRange)}
                  className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                >
                  {BACKTEST_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={runBacktests}
                  disabled={running}
                  className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: NAVY }}
                >
                  {running ? "Running…" : "Run backtest"}
                </button>
              </div>
            </div>

            {/* Warnings — prominent, right by the chart */}
            {allWarnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Data-coverage warnings</p>
                <ul className="mt-1 list-disc pl-5">
                  {allWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {Object.entries(errors).map(([id, msg]) => {
              const p = selected.find((s) => s.id === id);
              return (
                <p
                  key={id}
                  className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {p?.name ?? id}: {msg}
                </p>
              );
            })}

            {chartData.length > 0 && (
              <>
                <div className="mt-5 h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                        minTickGap={50}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => usd.format(Number(v))}
                        width={80}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          const p = selected.find((s) => s.id === name);
                          return [usd.format(Number(value)), p?.name ?? name];
                        }}
                      />
                      <Legend
                        formatter={(value) =>
                          selected.find((s) => s.id === value)?.name ?? value
                        }
                      />
                      {selected.map(
                        (p, i) =>
                          results[p.id] && (
                            <Line
                              key={p.id}
                              type="monotone"
                              dataKey={p.id}
                              stroke={LINE_COLORS[i % LINE_COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                              connectNulls
                            />
                          ),
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary stats */}
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-neutral-600">
                        <th className="py-2 pr-4 font-medium">Portfolio</th>
                        <th className="py-2 pr-4 font-medium">Window</th>
                        <th className="py-2 pr-4 font-medium">Final value</th>
                        <th className="py-2 pr-4 font-medium">Total return</th>
                        <th className="py-2 font-medium">Annualized</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected
                        .filter((p) => results[p.id])
                        .map((p) => {
                          const s = results[p.id].summaryStats;
                          return (
                            <tr key={p.id} className="border-b border-neutral-100">
                              <td className="py-2 pr-4 font-medium text-neutral-900">
                                <span
                                  className="mr-2 inline-block h-3 w-3 rounded-sm align-middle"
                                  style={{
                                    backgroundColor:
                                      LINE_COLORS[
                                        selected.indexOf(p) % LINE_COLORS.length
                                      ],
                                  }}
                                />
                                {p.name}
                              </td>
                              <td className="py-2 pr-4 text-neutral-600">
                                {results[p.id].effectiveStartDate} → now (
                                {s.months} mo)
                              </td>
                              <td className="py-2 pr-4 text-neutral-900">
                                {usd.format(s.finalValue)}
                              </td>
                              <td className="py-2 pr-4 text-neutral-900">
                                {s.totalReturnPercent.toFixed(1)}%
                              </td>
                              <td className="py-2 text-neutral-900">
                                {s.annualizedReturnPercent !== null
                                  ? `${s.annualizedReturnPercent.toFixed(1)}%/yr`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        <p className="mt-8 text-xs leading-5 text-neutral-500">
          Backtested results are hypothetical ESTIMATES based on historical data
          from Yahoo Finance, which may be delayed or incomplete. Assumes
          periodic rebalancing to target weights, cash held flat, and excludes
          fees and taxes. Past performance does not guarantee future results.
          For educational purposes only — not investment advice.
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------ */

function PortfolioPills({
  title,
  portfolios,
  selectedIds,
  onToggle,
}: {
  title: string;
  portfolios: SelectablePortfolio[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (portfolios.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {portfolios.map((p) => {
          const active = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "text-white"
                  : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
              }`}
              style={active ? { backgroundColor: NAVY, borderColor: NAVY } : undefined}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonCard({ portfolio }: { portfolio: SelectablePortfolio }) {
  // Model portfolios show their stocks/bonds/cash target split; user
  // portfolios (no asset-class data — we never guess) show holdings mix.
  const splitData = portfolio.split
    ? [
        { name: "Stocks", value: portfolio.split.stocks },
        { name: "Bonds", value: portfolio.split.bonds },
        { name: "Cash", value: portfolio.split.cash },
      ].filter((d) => d.value > 0)
    : portfolio.holdings
        .filter((h) => h.weight > 0)
        .map((h) => ({ name: h.symbol, value: h.weight }));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold" style={{ color: "var(--accent)" }}>
          {portfolio.name}
        </h3>
        <span className="shrink-0 rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-500">
          {portfolio.profile}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-neutral-400">
        {portfolio.isModel ? "Model portfolio" : "My portfolio"}
      </p>

      <div className="mx-auto mt-3 h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={splitData}
              dataKey="value"
              nameKey="name"
              innerRadius={28}
              outerRadius={52}
              paddingAngle={1}
            >
              {splitData.map((d, i) => (
                <Cell
                  key={d.name + i}
                  fill={
                    portfolio.split
                      ? SPLIT_COLORS[d.name as keyof typeof SPLIT_COLORS]
                      : d.name === "CASH"
                        ? "#A9B2BD"
                        : HOLDING_PALETTE[i % HOLDING_PALETTE.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-neutral-400">
        {portfolio.split ? "Stocks / bonds / cash" : "Holdings mix"}
      </p>

      <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3">
        {portfolio.holdings.map((h) => (
          <li key={h.symbol} className="flex justify-between text-sm">
            <span className="text-neutral-700">{h.symbol}</span>
            <span className="font-medium text-neutral-900">{h.weight}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
