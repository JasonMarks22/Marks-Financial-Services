"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateSavingsGoal } from "@/lib/finance/savingsGoal";
import { SaveAffordance } from "@/components/SaveAffordance";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { saveSavingsGoalScenario } from "@/lib/scenarios/savingsGoalScenarios";

// BYU navy is the main accent; the interest band uses a lighter blue.
const ACCENT = "#1B4332";
const INTEREST_BLUE = "#40916C";

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

// Parse a text input into a non-negative number, treating blanks as 0.
function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// useSearchParams requires a Suspense boundary, so the page itself is a thin
// wrapper around the actual calculator.
export default function SavingsGoalPage() {
  return (
    <Suspense fallback={null}>
      <SavingsGoalCalculator />
    </Suspense>
  );
}

function SavingsGoalCalculator() {
  // A "Load" from the saved-scenarios page passes inputs as URL query params;
  // when present they pre-fill the calculator, otherwise use the defaults.
  const searchParams = useSearchParams();
  const fromQuery = (key: string, fallback: string) =>
    searchParams.get(key) ?? fallback;

  const [goalAmount, setGoalAmount] = useState(() => fromQuery("goalAmount", "50000"));
  const [currentSavings, setCurrentSavings] = useState(() => fromQuery("currentSavings", "5000"));
  const [years, setYears] = useState(() => fromQuery("years", "10"));
  const [annualRatePercent, setAnnualRatePercent] = useState(() => fromQuery("rate", "4"));

  const result = useMemo(
    () =>
      calculateSavingsGoal({
        goalAmount: toNumber(goalAmount),
        currentSavings: toNumber(currentSavings),
        years: toNumber(years),
        annualRatePercent: parseFloat(annualRatePercent) || 0,
      }),
    [goalAmount, currentSavings, years, annualRatePercent],
  );

  const chartData = useMemo(
    () =>
      result.schedule.map((p) => ({
        month: p.month,
        contributions: Math.round(p.contributions),
        interestEarned: Math.round(p.interestEarned),
      })),
    [result],
  );

  const goalValue = toNumber(goalAmount);

  // Persist the current inputs as a named scenario (used by SaveAffordance;
  // only reachable when logged in).
  async function handleSave(name: string) {
    return saveSavingsGoalScenario(name, {
      goal_amount: toNumber(goalAmount),
      current_savings: toNumber(currentSavings),
      years: toNumber(years),
      annual_rate_percent: parseFloat(annualRatePercent) || 0,
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-surface px-6 py-14 text-ink sm:py-16">
      <div className="w-full max-w-6xl">
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
          Savings Goal Calculator
        </h1>
        <p className="mt-2 text-neutral-600">
          See how much to set aside each month to reach your target.
        </p>

        {/* Inputs */}
        <div className="mt-8 grid grid-cols-1 gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <Field
            label="Goal amount"
            prefix="$"
            value={goalAmount}
            onChange={setGoalAmount}
          />
          <Field
            label="Current savings"
            prefix="$"
            value={currentSavings}
            onChange={setCurrentSavings}
          />
          <Field label="Years" value={years} onChange={setYears} />
          <Field
            label="Expected annual return"
            suffix="%"
            value={annualRatePercent}
            onChange={setAnnualRatePercent}
          />
        </div>

        {/* Result */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          {result.alreadyOnTrack ? (
            <p className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
              You&rsquo;re already on track. No monthly contribution needed.
            </p>
          ) : (
            <p className="text-2xl font-semibold sm:text-3xl" style={{ color: "var(--accent)" }}>
              Save {usdCents.format(result.monthlyContribution)} per month to
              reach your goal.
            </p>
          )}

          <div className="mt-4 flex flex-col justify-center gap-2 text-sm text-neutral-600 sm:flex-row sm:gap-8">
            <span>
              Total contributions:{" "}
              <strong className="text-neutral-900">
                {usd.format(result.totalContributions)}
              </strong>
            </span>
            <span>
              Total interest earned:{" "}
              <strong className="text-neutral-900">
                {usd.format(result.totalInterest)}
              </strong>
            </span>
          </div>

          <Disclaimer className="mt-4">
            Assumes a constant return; actual results will vary.
          </Disclaimer>
          <SaveAffordance onSave={handleSave} />
        </div>

        {/* Growth chart */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700">
            Projected growth
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dce4dd" />
                <XAxis
                  dataKey="month"
                  stroke="#6b7a6f"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(m) => `${Math.round(Number(m) / 12)}y`}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#6b7a6f"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => usd.format(Number(v))}
                  width={70}
                />
                <Tooltip
                  formatter={(value, name) => [
                    usd.format(Number(value)),
                    name === "contributions"
                      ? "Contributions"
                      : "Interest earned",
                  ]}
                  labelFormatter={(m) => `Month ${m}`}
                />
                <Area
                  type="monotone"
                  dataKey="contributions"
                  stackId="1"
                  stroke={ACCENT}
                  fill={ACCENT}
                  fillOpacity={0.85}
                  name="contributions"
                />
                <Area
                  type="monotone"
                  dataKey="interestEarned"
                  stackId="1"
                  stroke={INTEREST_BLUE}
                  fill={INTEREST_BLUE}
                  fillOpacity={0.7}
                  name="interestEarned"
                />
                {goalValue > 0 && (
                  <ReferenceLine
                    y={goalValue}
                    stroke={ACCENT}
                    strokeDasharray="6 4"
                    label={{
                      value: `Goal ${usd.format(goalValue)}`,
                      position: "insideTopRight",
                      fill: "var(--accent)",
                      fontSize: 12,
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-center gap-6 text-xs text-neutral-600">
            <LegendSwatch color={ACCENT} label="Contributions" />
            <LegendSwatch color={INTEREST_BLUE} label="Interest earned" />
          </div>
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

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
