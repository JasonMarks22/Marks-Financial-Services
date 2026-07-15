"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

// BYU navy is the main accent; the interest band uses a lighter blue.
const NAVY = "#002E5D";
const INTEREST_BLUE = "#7FA8D0";

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

export default function SavingsGoalPage() {
  const [goalAmount, setGoalAmount] = useState("50000");
  const [currentSavings, setCurrentSavings] = useState("5000");
  const [years, setYears] = useState("10");
  const [annualRatePercent, setAnnualRatePercent] = useState("4");

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

  return (
    <main className="flex flex-1 flex-col items-center bg-white px-6 py-16 text-neutral-900">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          ← Back to home
        </Link>

        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: NAVY }}
        >
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
            <p className="text-2xl font-semibold" style={{ color: NAVY }}>
              You&rsquo;re already on track — no monthly contribution needed.
            </p>
          ) : (
            <p className="text-2xl font-semibold sm:text-3xl" style={{ color: NAVY }}>
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

          <p className="mt-4 text-xs leading-5 text-neutral-500">
            Estimate for educational purposes only — not financial advice.
            Assumes a constant return; actual results will vary.
          </p>
          <SaveAffordance />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(m) => `${Math.round(Number(m) / 12)}y`}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#9ca3af"
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
                  stroke={NAVY}
                  fill={NAVY}
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
                    stroke={NAVY}
                    strokeDasharray="6 4"
                    label={{
                      value: `Goal ${usd.format(goalValue)}`,
                      position: "insideTopRight",
                      fill: NAVY,
                      fontSize: 12,
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-center gap-6 text-xs text-neutral-600">
            <LegendSwatch color={NAVY} label="Contributions" />
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
