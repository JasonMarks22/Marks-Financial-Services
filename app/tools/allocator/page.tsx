"use client";

import { Suspense, useMemo, useState } from "react";
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
  type AllocationKey,
  allocateSavings,
} from "@/lib/finance/allocator";
import { SaveAffordance } from "@/components/SaveAffordance";
import { saveAllocatorScenario } from "@/lib/scenarios/allocatorScenarios";

// BYU navy is the main accent; secondary destinations use lighter blues/greys.
const ACCENT = "#1B4332";
const DEST_COLORS: Record<AllocationKey, string> = {
  checking: "#2D6A4F",
  debt: "#74C0DC",
  hysa: "#40916C",
  investments: ACCENT,
};

const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// useSearchParams requires a Suspense boundary, so the page itself is a thin
// wrapper around the actual calculator.
export default function AllocatorPage() {
  return (
    <Suspense fallback={null}>
      <AllocatorCalculator />
    </Suspense>
  );
}

function AllocatorCalculator() {
  // A "Load" from the saved-scenarios page passes inputs as URL query params;
  // when present they pre-fill the calculator, otherwise use the defaults.
  // The debt flag travels as "1"/"0".
  const searchParams = useSearchParams();
  const fromQuery = (key: string, fallback: string) =>
    searchParams.get(key) ?? fallback;

  const [leftover, setLeftover] = useState(() => fromQuery("leftover", "800"));
  const [emergencyFund, setEmergencyFund] = useState(() => fromQuery("emergencyFund", "2000"));
  const [essentials, setEssentials] = useState(() => fromQuery("essentials", "2500"));
  const [checkingBuffer, setCheckingBuffer] = useState(() => fromQuery("checkingBuffer", "1500"));
  const [hasDebt, setHasDebt] = useState(() => fromQuery("hasDebt", "0") === "1");

  const result = useMemo(
    () =>
      allocateSavings({
        monthlyLeftover: toNumber(leftover),
        currentEmergencyFund: toNumber(emergencyFund),
        monthlyEssentialExpenses: toNumber(essentials),
        hasHighInterestDebt: hasDebt,
        currentCheckingBuffer: toNumber(checkingBuffer),
      }),
    [leftover, emergencyFund, essentials, checkingBuffer, hasDebt],
  );

  const chartData = useMemo(
    () => result.allocations.filter((a) => a.amount > 0.005),
    [result],
  );

  // Persist the current inputs as a named scenario (used by SaveAffordance;
  // only reachable when logged in).
  async function handleSave(name: string) {
    return saveAllocatorScenario(name, {
      monthly_leftover: toNumber(leftover),
      current_emergency_fund: toNumber(emergencyFund),
      monthly_essential_expenses: toNumber(essentials),
      current_checking_buffer: toNumber(checkingBuffer),
      has_high_interest_debt: hasDebt,
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-6xl">
        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--accent)" }}
        >
          Savings Allocator
        </h1>
        <p className="mt-2 text-neutral-600">
          A common approach to splitting leftover money each month — with the
          reasoning behind every suggestion.
        </p>

        {/* Inputs */}
        <div className="mt-8 grid grid-cols-1 gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <Field label="Monthly leftover to allocate" prefix="$" value={leftover} onChange={setLeftover} />
          <Field label="Current emergency fund" prefix="$" value={emergencyFund} onChange={setEmergencyFund} />
          <Field label="Monthly essential expenses" prefix="$" value={essentials} onChange={setEssentials} />
          <Field label="Current checking buffer" prefix="$" value={checkingBuffer} onChange={setCheckingBuffer} />
          <label className="col-span-1 flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={hasDebt}
              onChange={(e) => setHasDebt(e.target.checked)}
              className="h-4 w-4 accent-[#1B4332]"
            />
            <span className="text-sm font-medium text-neutral-700">
              I have high-interest debt (e.g. credit cards)
            </span>
          </label>
        </div>

        {/* Recommended split: cards + chart */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
            Recommended monthly split
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Allocating {usdCents.format(result.monthlyLeftover)} of leftover this
            month.
          </p>

          <div className="mt-5 grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={1}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.key} fill={DEST_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => usdCents.format(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                  Enter a leftover amount to see the split.
                </div>
              )}
            </div>

            <ul className="space-y-2 text-sm">
              {result.allocations.map((a) => (
                <li
                  key={a.key}
                  className="flex items-center justify-between border-b border-neutral-100 pb-2"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ backgroundColor: DEST_COLORS[a.key] }}
                    />
                    <span className="text-neutral-700">{a.label}</span>
                  </span>
                  <span className="text-right">
                    <strong className="text-neutral-900">
                      {usdCents.format(a.amount)}
                    </strong>{" "}
                    <span className="text-neutral-500">
                      ({a.percent.toFixed(0)}%)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <SaveAffordance onSave={handleSave} />
        </div>

        {/* The "why" — reasoning for each destination */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
            Why this split?
          </h2>
          <div className="mt-4 space-y-4">
            {result.allocations.map((a) => (
              <div
                key={a.key}
                className="rounded-lg border-l-4 bg-neutral-50 p-4"
                style={{ borderColor: DEST_COLORS[a.key] }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-neutral-800">{a.label}</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    {usdCents.format(a.amount)} · {a.percent.toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-neutral-600">
                  {a.reason}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs leading-5 text-neutral-500">
            Estimate for educational purposes only — not financial advice. A
            common approach is shown here; the right split depends on your full
            situation and goals.
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-600">{label}</span>
      <div className="flex items-center rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-500">
        {prefix && <span className="text-neutral-500">{prefix}</span>}
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-2 py-2.5 text-neutral-900 outline-none"
        />
        {suffix && <span className="text-neutral-500">{suffix}</span>}
      </div>
    </label>
  );
}
