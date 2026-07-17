"use client";

/**
 * Monte Carlo investment simulator.
 *
 * Draws thousands of possible return paths from the user's expected return and
 * volatility, then shows the RANGE of outcomes (percentile fan) rather than a
 * single projection. All math lives in lib/finance/monteCarlo.ts and is seeded
 * (deterministic for given inputs) — this page only renders it.
 */

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { runMonteCarlo } from "@/lib/finance/monteCarlo";
import { Disclaimer } from "@/components/ui/Disclaimer";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Parse a text input into a non-negative number, treating blanks as 0. */
function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function MonteCarloPage() {
  const [initial, setInitial] = useState("10000");
  const [monthly, setMonthly] = useState("500");
  const [years, setYears] = useState("20");
  const [expectedReturn, setExpectedReturn] = useState("7");
  const [volatility, setVolatility] = useState("15");
  const [goal, setGoal] = useState("");

  const result = useMemo(
    () =>
      runMonteCarlo({
        initialAmount: toNumber(initial),
        monthlyContribution: toNumber(monthly),
        years: toNumber(years),
        expectedAnnualReturnPercent: parseFloat(expectedReturn) || 0,
        annualVolatilityPercent: parseFloat(volatility) || 0,
        goalAmount: toNumber(goal) || undefined,
      }),
    [initial, monthly, years, expectedReturn, volatility, goal],
  );

  const chartData = useMemo(() => {
    if (!result.ok) return [];
    return result.bands.map((b) => ({
      year: b.year,
      base: b.p10, // transparent floor of the shaded band
      range: Math.max(0, b.p90 - b.p10), // shaded band thickness (p10–p90)
      p10: b.p10,
      p50: b.p50,
      p90: b.p90,
    }));
  }, [result]);

  const goalNum = toNumber(goal);

  return (
    <main className="flex flex-1 flex-col items-center bg-surface px-6 py-14 text-ink sm:py-16">
      <div className="w-full max-w-6xl">
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
          Monte Carlo Simulator
        </h1>
        <p className="mt-2 text-neutral-600">
          Instead of one fixed return, this runs {result.ok ? result.simulations.toLocaleString("en-US") : "1,000"}{" "}
          possible futures and shows the range of outcomes, so you can see the
          uncertainty, not just a single number.
        </p>

        {/* Inputs */}
        <div className="mt-8 grid grid-cols-1 gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Starting amount" prefix="$" value={initial} onChange={setInitial} />
          <Field label="Monthly contribution" prefix="$" value={monthly} onChange={setMonthly} />
          <Field label="Years" value={years} onChange={setYears} />
          <Field
            label="Expected annual return"
            suffix="%"
            value={expectedReturn}
            onChange={setExpectedReturn}
            hint="Long-run average, e.g. ~7% for a stock-heavy mix"
          />
          <Field
            label="Volatility (annual std. dev.)"
            suffix="%"
            value={volatility}
            onChange={setVolatility}
            hint="How bumpy the ride is, e.g. ~15% for stocks"
          />
          <Field
            label="Goal (optional)"
            prefix="$"
            value={goal}
            onChange={setGoal}
            hint="See your odds of reaching it"
          />
        </div>

        {!result.ok ? (
          <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-red-600">{result.error}</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Median outcome"
                value={usd.format(result.endingMedian)}
                note="Half of paths end above this"
                accent
              />
              <SummaryCard
                label="Pessimistic (10th %ile)"
                value={usd.format(result.endingP10)}
                note="Only 10% of paths ended lower"
              />
              <SummaryCard
                label="Optimistic (90th %ile)"
                value={usd.format(result.endingP90)}
                note="Only 10% of paths ended higher"
              />
              {result.probabilityOfGoal !== null ? (
                <SummaryCard
                  label="Chance of reaching goal"
                  value={`${Math.round(result.probabilityOfGoal * 100)}%`}
                  note={`Paths ending at or above ${usd.format(goalNum)}`}
                  accent
                />
              ) : (
                <SummaryCard
                  label="Total contributed"
                  value={usd.format(result.totalContributed)}
                  note="Your money in, before any growth"
                />
              )}
            </div>

            {/* Fan chart */}
            <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-ink">Range of outcomes over time</h2>
              <p className="mt-1 text-sm text-neutral-600">
                The shaded band spans the 10th–90th percentile of simulated
                outcomes; the solid line is the median path.
              </p>
              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                    <XAxis
                      dataKey="year"
                      stroke="var(--muted)"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(y) => `${y}y`}
                    />
                    <YAxis
                      stroke="var(--muted)"
                      tick={{ fontSize: 12 }}
                      width={72}
                      tickFormatter={(v) => usd.format(Number(v))}
                    />
                    <Tooltip
                      labelFormatter={(y) => `Year ${y}`}
                      formatter={(value, name) => [usd.format(Number(value)), name]}
                    />
                    {/* Shaded p10–p90 band via a transparent floor + colored range. */}
                    <Area
                      dataKey="base"
                      stackId="band"
                      stroke="none"
                      fill="transparent"
                      tooltipType="none"
                      isAnimationActive={false}
                    />
                    <Area
                      dataKey="range"
                      stackId="band"
                      stroke="none"
                      fill="var(--brand-3)"
                      fillOpacity={0.18}
                      tooltipType="none"
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="p90"
                      name="90th percentile"
                      stroke="var(--muted)"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="p10"
                      name="10th percentile"
                      stroke="var(--muted)"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="p50"
                      name="Median"
                      stroke="var(--brand)"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs text-neutral-600">
                <LegendSwatch color="var(--brand)" label="Median (50th percentile)" />
                <LegendSwatch color="var(--brand-3)" label="10th–90th percentile range" band />
              </div>

              <p className="mt-6 text-xs leading-5 text-neutral-500">
                Best of {result.simulations.toLocaleString("en-US")} paths:{" "}
                {usd.format(result.endingBest)} · Worst:{" "}
                {usd.format(result.endingWorst)}.
              </p>
            </div>

            {/* Disclaimer */}
            <div className="mt-8">
              <Disclaimer>
                This is a simplified model: it assumes returns are normally
                distributed and independent month to month, and it ignores
                taxes, fees, and withdrawal timing. Real markets behave
                differently. It illustrates variability for learning. It is not
                a prediction of your actual results.
              </Disclaimer>
            </div>
          </>
        )}
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
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
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-5 shadow-sm"
      style={{
        borderColor: accent ? "var(--accent)" : "var(--card-border)",
        backgroundColor: accent ? "var(--card-accent-bg)" : "var(--card-bg)",
      }}
    >
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-neutral-500">{note}</p>
    </div>
  );
}

function LegendSwatch({
  color,
  label,
  band,
}: {
  color: string;
  label: string;
  band?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{ backgroundColor: color, opacity: band ? 0.35 : 1 }}
      />
      {label}
    </span>
  );
}
