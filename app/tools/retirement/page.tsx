"use client";

/**
 * Retirement / Compound-Growth Projector.
 * All math lives in lib/finance/retirement.ts; this page is UI only.
 */

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { projectRetirement } from "@/lib/finance/retirement";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ScenarioManager } from "@/components/ScenarioManager";

const ACCENT = "#1B4332";
const GROWTH_BLUE = "#40916C";
const REAL_GREEN = "#2D6A4F";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function toNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function RetirementPage() {
  const [currentAge, setCurrentAge] = useState("30");
  const [retirementAge, setRetirementAge] = useState("65");
  const [currentSavings, setCurrentSavings] = useState("25000");
  const [monthlyContribution, setMonthlyContribution] = useState("500");
  const [annualReturn, setAnnualReturn] = useState("7");
  const [inflationOn, setInflationOn] = useState(true);
  const [inflationRate, setInflationRate] = useState("2.5");

  const result = useMemo(
    () =>
      projectRetirement({
        currentAge: toNumber(currentAge),
        retirementAge: toNumber(retirementAge),
        currentSavings: toNumber(currentSavings),
        monthlyContribution: toNumber(monthlyContribution),
        annualReturnPercent: parseFloat(annualReturn) || 0,
        annualInflationPercent: inflationOn ? parseFloat(inflationRate) || 0 : 0,
      }),
    [
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution,
      annualReturn,
      inflationOn,
      inflationRate,
    ],
  );

  const chartData = useMemo(() => {
    if (!result.ok) return [];
    return result.series.map((p) => ({
      age: p.age,
      contributions: Math.round(p.contributions),
      growth: Math.round(p.growth),
      realBalance: p.realBalance !== null ? Math.round(p.realBalance) : undefined,
    }));
  }, [result]);

  // Snapshot current inputs / apply a loaded scenario (used by ScenarioManager).
  const scenarioData = () => ({
    current_age: toNumber(currentAge),
    retirement_age: toNumber(retirementAge),
    current_savings: toNumber(currentSavings),
    monthly_contribution: toNumber(monthlyContribution),
    annual_return_percent: parseFloat(annualReturn) || 0,
    inflation_on: inflationOn,
    annual_inflation_percent: parseFloat(inflationRate) || 0,
  });
  function loadScenario(d: Record<string, unknown>) {
    setCurrentAge(String(d.current_age ?? ""));
    setRetirementAge(String(d.retirement_age ?? ""));
    setCurrentSavings(String(d.current_savings ?? ""));
    setMonthlyContribution(String(d.monthly_contribution ?? ""));
    setAnnualReturn(String(d.annual_return_percent ?? ""));
    setInflationOn(Boolean(d.inflation_on));
    setInflationRate(String(d.annual_inflation_percent ?? ""));
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-surface px-6 py-14 text-ink sm:py-16">
      <div className="w-full max-w-6xl">
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
          Retirement Projector
        </h1>
        <p className="mt-2 text-neutral-600">
          See how steady monthly investing could compound between now and
          retirement.
        </p>

        {/* Inputs */}
        <div className="mt-8 grid grid-cols-1 gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Current age" value={currentAge} onChange={setCurrentAge} />
          <Field label="Retirement age" value={retirementAge} onChange={setRetirementAge} />
          <Field label="Current savings" prefix="$" value={currentSavings} onChange={setCurrentSavings} />
          <Field label="Monthly contribution" prefix="$" value={monthlyContribution} onChange={setMonthlyContribution} />
          <Field label="Expected annual return" suffix="%" value={annualReturn} onChange={setAnnualReturn} />
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <input
                type="checkbox"
                checked={inflationOn}
                onChange={(e) => setInflationOn(e.target.checked)}
                className="h-4 w-4 accent-[#1B4332]"
              />
              Show in today&rsquo;s dollars
            </label>
            <div
              className={`flex items-center rounded-lg border border-neutral-300 px-3 focus-within:border-neutral-500 ${
                inflationOn ? "" : "opacity-40"
              }`}
            >
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={inflationRate}
                disabled={!inflationOn}
                onChange={(e) => setInflationRate(e.target.value)}
                aria-label="Annual inflation rate percent"
                className="w-full bg-transparent px-2 py-2.5 text-neutral-900 outline-none"
              />
              <span className="text-neutral-500">% inflation</span>
            </div>
          </div>
        </div>

        {!result.ok ? (
          <p className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {result.error}
          </p>
        ) : (
          <>
            {/* Headline results */}
            <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                    Projected balance at {toNumber(retirementAge)}
                  </p>
                  <p
                    className="mt-1 text-4xl font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    {usd.format(result.finalBalance)}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Nominal (future dollars)
                  </p>
                </div>
                {result.realFinalBalance !== null && (
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                      In today&rsquo;s dollars
                    </p>
                    <p
                      className="mt-1 text-4xl font-semibold"
                      style={{ color: REAL_GREEN }}
                    >
                      {usd.format(result.realFinalBalance)}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      Same balance, expressed in today&rsquo;s spending power
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col justify-center gap-2 border-t border-neutral-100 pt-4 text-sm text-neutral-600 sm:flex-row sm:gap-8">
                <span>
                  Total contributions:{" "}
                  <strong className="text-neutral-900">
                    {usd.format(result.totalContributed)}
                  </strong>
                </span>
                <span>
                  Investment growth:{" "}
                  <strong className="text-neutral-900">
                    {usd.format(result.totalGrowth)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Growth chart */}
            <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2
                className="mb-4 text-lg font-semibold"
                style={{ color: "var(--accent)" }}
              >
                Balance by age
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#dce4dd" />
                    <XAxis
                      dataKey="age"
                      stroke="#6b7a6f"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(a) => `${a}`}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#6b7a6f"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => usd.format(Number(v))}
                      width={90}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        usd.format(Number(value)),
                        name === "contributions"
                          ? "Contributions"
                          : name === "growth"
                            ? "Investment growth"
                            : "Today's dollars",
                      ]}
                      labelFormatter={(age) => `Age ${age}`}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "contributions"
                          ? "Contributions"
                          : value === "growth"
                            ? "Investment growth"
                            : "Today's dollars"
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="contributions"
                      stackId="1"
                      stroke={ACCENT}
                      fill={ACCENT}
                      fillOpacity={0.85}
                    />
                    <Area
                      type="monotone"
                      dataKey="growth"
                      stackId="1"
                      stroke={GROWTH_BLUE}
                      fill={GROWTH_BLUE}
                      fillOpacity={0.7}
                    />
                    {inflationOn && (
                      <Line
                        type="monotone"
                        dataKey="realBalance"
                        stroke={REAL_GREEN}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 flex justify-center">
          <ScenarioManager
            tool="retirement"
            getData={scenarioData}
            onLoad={loadScenario}
          />
        </div>

        <Disclaimer className="mt-8">
          Projections are estimates based on a constant assumed return and
          inflation rate; actual results will vary. Inflation-adjusted figures
          express future value in today&rsquo;s dollars.
        </Disclaimer>
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
