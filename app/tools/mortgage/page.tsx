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
  amortizationSchedule,
  extraPaymentComparison,
  monthlyCostBreakdown,
} from "@/lib/finance/mortgage";
import { SaveAffordance } from "@/components/SaveAffordance";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { saveMortgageScenario } from "@/lib/scenarios/mortgageScenarios";

// BYU navy is the main accent; the rest are lighter blues/greys for the
// secondary cost bands.
const ACCENT = "#1B4332";
const COMPONENT_COLORS: Record<string, string> = {
  "Principal & Interest": ACCENT,
  "Property Tax": "#2D6A4F",
  Insurance: "#40916C",
  PMI: "#74C0DC",
  HOA: "#A8D0DB",
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

function monthsToYearsLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

// useSearchParams requires a Suspense boundary, so the page itself is a thin
// wrapper around the actual calculator.
export default function MortgagePage() {
  return (
    <Suspense fallback={null}>
      <MortgageCalculator />
    </Suspense>
  );
}

function MortgageCalculator() {
  // A "Load" from the saved-scenarios page passes inputs as URL query params;
  // when present they pre-fill the calculator, otherwise use the defaults.
  const searchParams = useSearchParams();
  const fromQuery = (key: string, fallback: string) =>
    searchParams.get(key) ?? fallback;

  const [homePrice, setHomePrice] = useState(() => fromQuery("homePrice", "400000"));
  const [downPayment, setDownPayment] = useState(() => fromQuery("downPayment", "60000"));
  const [termYears, setTermYears] = useState(() => fromQuery("termYears", "30"));
  const [rate, setRate] = useState(() => fromQuery("rate", "6.5"));
  const [propertyTax, setPropertyTax] = useState(() => fromQuery("propertyTax", "4800"));
  const [insurance, setInsurance] = useState(() => fromQuery("insurance", "1800"));
  const [hoa, setHoa] = useState(() => fromQuery("hoa", "0"));
  const [extra, setExtra] = useState(() => fromQuery("extra", "0"));
  const [showFullTable, setShowFullTable] = useState(false);

  const priceNum = toNumber(homePrice);
  const downNum = toNumber(downPayment);
  const downPercent = priceNum > 0 ? (downNum / priceNum) * 100 : 0;
  const extraNum = toNumber(extra);

  const breakdown = useMemo(
    () =>
      monthlyCostBreakdown({
        homePrice: priceNum,
        downPayment: downNum,
        termYears: toNumber(termYears),
        annualRatePercent: parseFloat(rate) || 0,
        annualPropertyTax: toNumber(propertyTax),
        annualInsurance: toNumber(insurance),
        monthlyHOA: toNumber(hoa),
      }),
    [priceNum, downNum, termYears, rate, propertyTax, insurance, hoa],
  );

  const amort = useMemo(
    () =>
      amortizationSchedule(
        breakdown.loanAmount,
        breakdown.r,
        breakdown.n,
        breakdown.principalAndInterest,
      ),
    [breakdown],
  );

  const comparison = useMemo(
    () =>
      extraPaymentComparison(
        breakdown.loanAmount,
        breakdown.r,
        breakdown.n,
        breakdown.principalAndInterest,
        extraNum,
      ),
    [breakdown, extraNum],
  );

  // Persist the current inputs as a named scenario (used by SaveAffordance;
  // only reachable when logged in).
  async function handleSave(name: string) {
    return saveMortgageScenario(name, {
      home_price: priceNum,
      down_payment: downNum,
      term_years: toNumber(termYears),
      interest_rate: parseFloat(rate) || 0,
      annual_property_tax: toNumber(propertyTax),
      annual_insurance: toNumber(insurance),
      monthly_hoa: toNumber(hoa),
      extra_monthly: extraNum,
    });
  }

  const donutData = useMemo(
    () =>
      [
        { name: "Principal & Interest", value: breakdown.principalAndInterest },
        { name: "Property Tax", value: breakdown.propertyTax },
        { name: "Insurance", value: breakdown.insurance },
        { name: "PMI", value: breakdown.pmi },
        { name: "HOA", value: breakdown.hoa },
      ].filter((d) => d.value > 0.005),
    [breakdown],
  );

  return (
    <main className="flex flex-1 flex-col items-center bg-surface px-6 py-14 text-ink sm:py-16">
      <div className="w-full max-w-6xl">
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
          Mortgage Calculator
        </h1>
        <p className="mt-2 text-neutral-600">
          Estimate your all-in monthly payment, see how the loan amortizes, and
          model paying it off early.
        </p>

        {/* Inputs */}
        <div className="mt-8 grid grid-cols-1 gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <Field label="Home price" prefix="$" value={homePrice} onChange={setHomePrice} />
          <Field
            label="Down payment"
            prefix="$"
            value={downPayment}
            onChange={setDownPayment}
            hint={priceNum > 0 ? `${downPercent.toFixed(1)}% of price` : undefined}
          />
          <Field label="Term" suffix="yrs" value={termYears} onChange={setTermYears} />
          <Field label="Interest rate" suffix="%" value={rate} onChange={setRate} />
          <Field label="Annual property tax" prefix="$" value={propertyTax} onChange={setPropertyTax} />
          <Field label="Annual insurance" prefix="$" value={insurance} onChange={setInsurance} />
          <Field label="Monthly HOA" prefix="$" value={hoa} onChange={setHoa} />
          <Field label="Extra monthly payment (optional)" prefix="$" value={extra} onChange={setExtra} />
        </div>

        {/* Result: total + donut */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Total monthly cost
            </p>
            <p className="mt-1 text-4xl font-semibold" style={{ color: "var(--accent)" }}>
              {usdCents.format(breakdown.totalMonthly)}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Loan amount {usd.format(breakdown.loanAmount)} · Total interest over{" "}
              {toNumber(termYears)} years:{" "}
              <strong className="text-neutral-900">
                {usd.format(breakdown.totalInterest)}
              </strong>
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={1}
                  >
                    {donutData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={COMPONENT_COLORS[entry.name] ?? ACCENT}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => usdCents.format(Number(value))}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="space-y-2 text-sm">
              <CostRow label="Principal & Interest" value={breakdown.principalAndInterest} />
              <CostRow label="Property Tax" value={breakdown.propertyTax} />
              <CostRow label="Insurance" value={breakdown.insurance} />
              <CostRow
                label="PMI"
                value={breakdown.pmi}
                note={
                  breakdown.pmi > 0
                    ? `${downPercent.toFixed(1)}% down — under 20%`
                    : "$0 — at/above 20% down"
                }
                highlight
              />
              <CostRow label="HOA" value={breakdown.hoa} />
            </ul>
          </div>

          <Disclaimer className="mt-6">
            Actual costs vary by lender, location, taxes, and insurance.
          </Disclaimer>
          <SaveAffordance onSave={handleSave} />
        </div>

        {/* Extra-payment comparison */}
        {extraNum > 0 && breakdown.loanAmount > 0 && (
          <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
              Paying {usd.format(extraNum)} extra per month
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ScenarioCard
                title="Without extra"
                payoff={comparison.withoutExtra.payoffMonths}
                interest={comparison.withoutExtra.totalInterest}
              />
              <ScenarioCard
                title="With extra"
                payoff={comparison.withExtra.payoffMonths}
                interest={comparison.withExtra.totalInterest}
                accent
              />
            </div>
            <p className="mt-4 text-center text-sm text-neutral-700">
              You&rsquo;d pay off{" "}
              <strong style={{ color: "var(--accent)" }}>
                {monthsToYearsLabel(comparison.monthsSaved)}
              </strong>{" "}
              sooner and save{" "}
              <strong style={{ color: "var(--accent)" }}>
                {usd.format(comparison.interestSaved)}
              </strong>{" "}
              in interest.
            </p>
          </div>
        )}

        {/* Amortization schedule */}
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
              Amortization schedule
            </h2>
            <button
              type="button"
              onClick={() => setShowFullTable((v) => !v)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-500"
            >
              {showFullTable ? "Show yearly summary" : "Show full monthly table"}
            </button>
          </div>

          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-neutral-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {showFullTable ? "Month" : "Year"}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Interest</th>
                  <th className="px-3 py-2 text-right font-medium">Principal</th>
                  <th className="px-3 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {showFullTable
                  ? amort.monthly.map((row) => (
                      <tr key={row.month} className="border-t border-neutral-100">
                        <td className="px-3 py-1.5">{row.month}</td>
                        <td className="px-3 py-1.5 text-right">{usdCents.format(row.interest)}</td>
                        <td className="px-3 py-1.5 text-right">{usdCents.format(row.principal)}</td>
                        <td className="px-3 py-1.5 text-right">{usd.format(row.balance)}</td>
                      </tr>
                    ))
                  : amort.yearly.map((row) => (
                      <tr key={row.year} className="border-t border-neutral-100">
                        <td className="px-3 py-1.5">{row.year}</td>
                        <td className="px-3 py-1.5 text-right">{usd.format(row.interestPaid)}</td>
                        <td className="px-3 py-1.5 text-right">{usd.format(row.principalPaid)}</td>
                        <td className="px-3 py-1.5 text-right">{usd.format(row.endingBalance)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
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

function CostRow({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: number;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center justify-between border-b border-neutral-100 pb-2">
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: COMPONENT_COLORS[label] ?? ACCENT }}
        />
        <span className="text-neutral-700">{label}</span>
        {note && (
          <span
            className={`text-xs ${highlight ? "text-neutral-500" : "text-neutral-400"}`}
          >
            ({note})
          </span>
        )}
      </span>
      <strong className="text-neutral-900">{usdCents.format(value)}</strong>
    </li>
  );
}

function ScenarioCard({
  title,
  payoff,
  interest,
  accent,
}: {
  title: string;
  payoff: number;
  interest: number;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: accent ? "var(--accent)" : "var(--card-border)",
        backgroundColor: accent ? "var(--card-accent-bg)" : "var(--card-bg)",
      }}
    >
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color: "var(--accent)" }}>
        {monthsToYearsLabel(payoff)}
      </p>
      <p className="mt-1 text-sm text-neutral-600">
        Total interest: {usd.format(interest)}
      </p>
    </div>
  );
}
