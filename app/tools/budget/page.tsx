"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  type Bucket,
  type BudgetCategory,
  calculateBudget,
} from "@/lib/finance/budget";
import { SaveAffordance } from "@/components/SaveAffordance";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getBudgetScenario,
  saveBudgetScenario,
} from "@/lib/scenarios/budgetScenarios";

// BYU navy is the main accent; a graded blue/grey ramp colors the categories.
const ACCENT = "#1B4332";
const CATEGORY_PALETTE = [
  "#1B4332",
  "#2D6A4F",
  "#40916C",
  "#5FA97F",
  "#74C0DC",
  "#A8D0DB",
  "#8FAF9B",
  "#96B8AA",
];

const BUCKET_LABELS: Record<Bucket, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Each row keeps its amount as a string so the input stays freely editable.
interface CategoryRow {
  id: number;
  name: string;
  amount: string;
  bucket: Bucket;
}

let nextId = 100;

const DEFAULT_ROWS: CategoryRow[] = [
  { id: 1, name: "Housing", amount: "1500", bucket: "needs" },
  { id: 2, name: "Groceries", amount: "500", bucket: "needs" },
  { id: 3, name: "Utilities", amount: "250", bucket: "needs" },
  { id: 4, name: "Transportation", amount: "300", bucket: "needs" },
  { id: 5, name: "Dining out", amount: "300", bucket: "wants" },
  { id: 6, name: "Entertainment", amount: "150", bucket: "wants" },
  { id: 7, name: "Savings", amount: "600", bucket: "savings" },
];

// useSearchParams requires a Suspense boundary, so the page itself is a thin
// wrapper around the actual calculator.
export default function BudgetPage() {
  return (
    <Suspense fallback={null}>
      <BudgetCalculator />
    </Suspense>
  );
}

function BudgetCalculator() {
  const [income, setIncome] = useState("4500");
  const [rows, setRows] = useState<CategoryRow[]>(DEFAULT_ROWS);
  const [loadError, setLoadError] = useState<string | null>(null);

  // "Load" from the saved-scenarios page passes just the scenario id in the
  // URL (the category list is too large for query params); we re-fetch the
  // row and rebuild the editable list from it. The fetch waits for the auth
  // session, since RLS only lets the owner read the row.
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenario");
  const { user } = useAuth();

  useEffect(() => {
    if (!scenarioId || !user) return;
    let cancelled = false;
    getBudgetScenario(scenarioId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setLoadError(
          error
            ? `Couldn't load scenario: ${error}`
            : "Couldn't load scenario: not found.",
        );
        return;
      }
      setIncome(String(data.monthly_income));
      setRows(
        data.categories.map((c) => ({
          id: nextId++,
          name: c.name,
          amount: String(c.amount),
          bucket: c.bucket,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [scenarioId, user]);

  const incomeNum = toNumber(income);

  const categories: BudgetCategory[] = useMemo(
    () =>
      rows.map((row) => ({
        name: row.name,
        amount: toNumber(row.amount),
        bucket: row.bucket,
      })),
    [rows],
  );

  const result = useMemo(
    () => calculateBudget(incomeNum, categories),
    [incomeNum, categories],
  );

  const chartData = useMemo(
    () =>
      rows
        .map((row) => ({
          name: row.name.trim() || "Untitled",
          value: toNumber(row.amount),
        }))
        .filter((d) => d.value > 0),
    [rows],
  );

  // Persist the current income + full category list as a named scenario
  // (used by SaveAffordance; only reachable when logged in).
  async function handleSave(name: string) {
    return saveBudgetScenario(name, incomeNum, categories);
  }

  function updateRow(id: number, patch: Partial<CategoryRow>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: nextId++, name: "", amount: "", bucket: "needs" },
    ]);
  }

  function deleteRow(id: number) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-6xl">
        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--accent)" }}
        >
          Budget Calculator
        </h1>
        <p className="mt-2 text-neutral-600">
          Build your own categories and see how your spending lines up with the
          50/30/20 guideline.
        </p>

        {loadError && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {loadError}
          </p>
        )}

        {/* Income */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <label className="flex flex-col gap-1.5 sm:max-w-xs">
            <span className="text-sm font-medium text-neutral-600">
              Monthly take-home income
            </span>
            <div className="flex items-center rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-500">
              <span className="text-neutral-500">$</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full bg-transparent px-2 py-2.5 text-neutral-900 outline-none"
              />
            </div>
          </label>
        </div>

        {/* Editable category list */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
              Spending categories
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: ACCENT }}
            >
              + Add category
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {/* Column headers */}
            <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium uppercase tracking-wide text-neutral-400 sm:grid">
              <span className="col-span-5">Category</span>
              <span className="col-span-3">Amount</span>
              <span className="col-span-3">Bucket</span>
              <span className="col-span-1" />
            </div>

            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 items-center gap-2"
              >
                <input
                  type="text"
                  value={row.name}
                  placeholder="Category name"
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  className="col-span-12 rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500 sm:col-span-5"
                />
                <div className="col-span-6 flex items-center rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-500 sm:col-span-3">
                  <span className="text-neutral-500">$</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={row.amount}
                    placeholder="0"
                    onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                    className="w-full bg-transparent px-2 py-2 text-neutral-900 outline-none"
                  />
                </div>
                <select
                  value={row.bucket}
                  onChange={(e) =>
                    updateRow(row.id, { bucket: e.target.value as Bucket })
                  }
                  className="col-span-5 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-neutral-900 outline-none focus:border-neutral-500 sm:col-span-3"
                >
                  <option value="needs">Needs</option>
                  <option value="wants">Wants</option>
                  <option value="savings">Savings</option>
                </select>
                <button
                  type="button"
                  onClick={() => deleteRow(row.id)}
                  aria-label={`Delete ${row.name || "category"}`}
                  className="col-span-1 flex h-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:border-red-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}

            {rows.length === 0 && (
              <p className="py-4 text-center text-sm text-neutral-400">
                No categories yet — add one to get started.
              </p>
            )}
          </div>
        </div>

        {/* Totals + leftover */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Total spending
          </p>
          <p className="mt-1 text-3xl font-semibold" style={{ color: "var(--accent)" }}>
            {usdCents.format(result.totalSpending)}
          </p>

          {result.overspending ? (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-lg font-semibold text-red-600">
              You&rsquo;re {usdCents.format(result.overspendingAmount)} over
              budget.
            </p>
          ) : (
            <p className="mt-3 text-lg font-medium text-neutral-700">
              Left to allocate:{" "}
              <strong style={{ color: "var(--accent)" }}>
                {usdCents.format(result.leftover)}
              </strong>
            </p>
          )}
          <SaveAffordance onSave={handleSave} />
        </div>

        {/* Spending breakdown chart */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--accent)" }}>
            Spending by category
          </h2>
          {chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={1}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={entry.name + i}
                        fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => usdCents.format(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-neutral-400">
              Enter some category amounts to see the breakdown.
            </p>
          )}
        </div>

        {/* 50/30/20 comparison */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
            Needs / Wants / Savings vs. 50/30/20
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Your actual spending in each bucket compared with the classic
            guideline.
          </p>

          <div className="mt-5 space-y-5">
            {(Object.keys(BUCKET_LABELS) as Bucket[]).map((bucket) => {
              const b = result.buckets[bucket];
              const targetPct =
                bucket === "needs" ? 50 : bucket === "wants" ? 30 : 20;
              return (
                <div key={bucket}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-neutral-800">
                      {BUCKET_LABELS[bucket]}
                    </span>
                    <span className="text-neutral-600">
                      <strong className="text-neutral-900">
                        {usd.format(b.amount)}
                      </strong>{" "}
                      ({b.percentOfIncome.toFixed(0)}%) · target{" "}
                      {usd.format(b.target)} ({targetPct}%)
                    </span>
                  </div>
                  {/* Actual bar with the target marked as a vertical line. */}
                  <div className="relative mt-1.5 h-3 w-full rounded-full bg-neutral-100">
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${Math.min(100, b.percentOfIncome)}%`,
                        backgroundColor: ACCENT,
                      }}
                    />
                    <div
                      className="absolute top-[-2px] h-4 w-0.5 bg-neutral-500"
                      style={{ left: `${Math.min(100, targetPct)}%` }}
                      title={`Target ${targetPct}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-neutral-400">
            The grey tick on each bar marks the 50/30/20 target for that bucket.
          </p>
        </div>
      </div>
    </main>
  );
}
