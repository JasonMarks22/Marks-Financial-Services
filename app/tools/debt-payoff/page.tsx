"use client";

/**
 * Debt Payoff Planner — avalanche vs. snowball, side by side.
 * All math lives in lib/finance/debtPayoff.ts; this page is UI only.
 */

import { useMemo, useState } from "react";
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
import {
  planDebtPayoff,
  type StrategyResult,
} from "@/lib/finance/debtPayoff";

const NAVY = "#002E5D";
const GOLD = "#B0864B";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function monthsLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

interface DebtRow {
  id: number;
  name: string;
  balance: string;
  rate: string;
  minPayment: string;
}

let nextId = 100;

const DEFAULT_ROWS: DebtRow[] = [
  { id: 1, name: "Credit card", balance: "4500", rate: "22.9", minPayment: "120" },
  { id: 2, name: "Car loan", balance: "9800", rate: "6.5", minPayment: "250" },
];

export default function DebtPayoffPage() {
  const [rows, setRows] = useState<DebtRow[]>(DEFAULT_ROWS);
  const [extra, setExtra] = useState("200");

  const result = useMemo(
    () =>
      planDebtPayoff(
        rows.map((r) => ({
          name: r.name.trim() || "Untitled debt",
          balance: toNumber(r.balance),
          annualRatePercent: parseFloat(r.rate) || 0,
          minimumPayment: toNumber(r.minPayment),
        })),
        toNumber(extra),
      ),
    [rows, extra],
  );

  // Merge both strategies' series into one chart dataset by month index.
  const chartData = useMemo(() => {
    const byMonth = new Map<
      number,
      { month: number; avalanche?: number; snowball?: number }
    >();
    const add = (series: StrategyResult["series"], key: "avalanche" | "snowball") => {
      for (const p of series) {
        const row = byMonth.get(p.month) ?? { month: p.month };
        row[key] = Math.round(p.totalBalance);
        byMonth.set(p.month, row);
      }
    };
    if (result.avalanche) add(result.avalanche.series, "avalanche");
    if (result.snowball) add(result.snowball.series, "snowball");
    return [...byMonth.values()].sort((a, b) => a.month - b.month);
  }, [result]);

  function updateRow(id: number, patch: Partial<DebtRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: nextId++, name: "", balance: "", rate: "", minPayment: "" },
    ]);
  }

  function deleteRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-6xl">
        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--accent)" }}
        >
          Debt Payoff Planner
        </h1>
        <p className="mt-2 text-neutral-600">
          Compare the avalanche and snowball strategies for your debts and see
          how much time and interest each one takes.
        </p>

        {/* Debts list */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
              Your debts
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: NAVY }}
            >
              + Add debt
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium uppercase tracking-wide text-neutral-400 sm:grid">
              <span className="col-span-4">Debt</span>
              <span className="col-span-3">Balance</span>
              <span className="col-span-2">Rate</span>
              <span className="col-span-2">Min payment</span>
              <span className="col-span-1" />
            </div>

            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-12 items-center gap-2">
                <input
                  type="text"
                  value={row.name}
                  placeholder="Debt name"
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  className="col-span-12 rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500 sm:col-span-4"
                />
                <div className="col-span-4 flex items-center rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-500 sm:col-span-3">
                  <span className="text-neutral-500">$</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={row.balance}
                    placeholder="0"
                    onChange={(e) => updateRow(row.id, { balance: e.target.value })}
                    className="w-full bg-transparent px-2 py-2 text-neutral-900 outline-none"
                  />
                </div>
                <div className="col-span-3 flex items-center rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-500 sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={row.rate}
                    placeholder="0"
                    onChange={(e) => updateRow(row.id, { rate: e.target.value })}
                    className="w-full bg-transparent px-1 py-2 text-right text-neutral-900 outline-none"
                  />
                  <span className="text-neutral-500">%</span>
                </div>
                <div className="col-span-4 flex items-center rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-500 sm:col-span-2">
                  <span className="text-neutral-500">$</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={row.minPayment}
                    placeholder="0"
                    onChange={(e) =>
                      updateRow(row.id, { minPayment: e.target.value })
                    }
                    className="w-full bg-transparent px-2 py-2 text-neutral-900 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => deleteRow(row.id)}
                  aria-label={`Delete ${row.name || "debt"}`}
                  className="col-span-1 flex h-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:border-red-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <label className="mt-5 flex flex-col gap-1.5 border-t border-neutral-100 pt-4 sm:max-w-xs">
            <span className="text-sm font-medium text-neutral-600">
              Extra monthly payment (beyond minimums)
            </span>
            <div className="flex items-center rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-500">
              <span className="text-neutral-500">$</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                className="w-full bg-transparent px-2 py-2.5 text-neutral-900 outline-none"
              />
            </div>
          </label>
        </div>

        {/* Warnings */}
        {result.warnings.map((w, i) => (
          <p
            key={i}
            className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
          >
            {w}
          </p>
        ))}

        {/* Strategy comparison */}
        {result.avalanche && result.snowball && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <StrategyCard
                title="Avalanche"
                subtitle="Extra money attacks the highest interest rate first"
                result={result.avalanche}
                accent
              />
              <StrategyCard
                title="Snowball"
                subtitle="Extra money attacks the smallest balance first"
                result={result.snowball}
              />
            </div>

            {result.interestSavedByAvalanche !== null && (
              <p className="mt-6 text-center text-sm text-neutral-700">
                {result.interestSavedByAvalanche > 0.5 ? (
                  <>
                    Avalanche saves{" "}
                    <strong style={{ color: "var(--accent)" }}>
                      {usd.format(result.interestSavedByAvalanche)}
                    </strong>{" "}
                    in interest compared to snowball.
                  </>
                ) : (
                  "Both strategies cost about the same in interest for these debts."
                )}
              </p>
            )}

            {/* Chart */}
            <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
                Total remaining debt over time
              </h2>
              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="month"
                      stroke="#9ca3af"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(m) => monthsLabel(Number(m))}
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => usd.format(Number(v))}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        usd.format(Number(value)),
                        name === "avalanche" ? "Avalanche" : "Snowball",
                      ]}
                      labelFormatter={(m) => `Month ${m}`}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "avalanche" ? "Avalanche" : "Snowball"
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="avalanche"
                      stroke={NAVY}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="snowball"
                      stroke={GOLD}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        <p className="mt-8 text-xs leading-5 text-neutral-500">
          For educational purposes only — not financial advice. Estimates
          assume fixed rates and consistent payments.
        </p>
      </div>
    </main>
  );
}

function StrategyCard({
  title,
  subtitle,
  result,
  accent,
}: {
  title: string;
  subtitle: string;
  result: StrategyResult;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl border bg-white p-6 shadow-sm"
      style={{ borderColor: accent ? NAVY : "#e5e5e5" }}
    >
      <h3 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>

      <div className="mt-4 flex gap-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Debt-free in
          </p>
          <p className="mt-0.5 text-2xl font-semibold" style={{ color: "var(--accent)" }}>
            {monthsLabel(result.payoffMonths)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Total interest
          </p>
          <p className="mt-0.5 text-2xl font-semibold" style={{ color: "var(--accent)" }}>
            {usd.format(result.totalInterest)}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Payoff order
        </p>
        <ol className="mt-1.5 space-y-1 text-sm text-neutral-700">
          {result.payoffOrder.map((name, i) => (
            <li key={name + i}>
              {i + 1}. {name}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
