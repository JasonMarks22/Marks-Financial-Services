"use client";

/**
 * Model portfolios page — displays the 7 educational seed portfolios from
 * lib/portfolios/modelPortfolios.ts. No live prices here; this only renders
 * the model definitions.
 */

import Link from "next/link";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  MODEL_PORTFOLIOS,
  type ModelPortfolio,
} from "@/lib/portfolios/modelPortfolios";

const NAVY = "#002E5D";
const SPLIT_COLORS = {
  Stocks: NAVY,
  Bonds: "#7FA8D0",
  Cash: "#A9B2BD",
} as const;

export default function PortfoliosPage() {
  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-5xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          ← Back to home
        </Link>

        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--accent)" }}
        >
          Model Portfolios
        </h1>
        <p className="mt-2 text-neutral-600">
          Seven common risk profiles, from most conservative to most aggressive.
        </p>

        {/* Prominent disclaimer */}
        <div className="mt-6 rounded-xl border border-neutral-300 bg-white p-4 text-sm leading-6 text-neutral-700 shadow-sm">
          These model portfolios are illustrative examples based on published
          asset-allocation frameworks (e.g. Vanguard, Fidelity), for educational
          purposes only. They are not investment advice or recommendations.
          Past performance does not guarantee future results. Ticker symbols
          shown are examples of the asset classes described.
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {MODEL_PORTFOLIOS.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      </div>
    </main>
  );
}

function PortfolioCard({ portfolio }: { portfolio: ModelPortfolio }) {
  const splitData = [
    { name: "Stocks", value: portfolio.targetSplit.stocks },
    { name: "Bonds", value: portfolio.targetSplit.bonds },
    { name: "Cash", value: portfolio.targetSplit.cash },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
          {portfolio.name}
        </h2>
        <span className="shrink-0 rounded-full border border-neutral-200 px-3 py-0.5 text-xs font-medium text-neutral-500">
          {portfolio.profile}
        </span>
      </div>
      <p className="mt-1 text-sm leading-6 text-neutral-600">
        {portfolio.description}
      </p>

      <div className="mt-4 flex items-center gap-4">
        {/* Target split donut */}
        <div className="h-28 w-28 shrink-0">
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
                {splitData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={SPLIT_COLORS[d.name as keyof typeof SPLIT_COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="space-y-1 text-sm">
          {splitData.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{
                  backgroundColor:
                    SPLIT_COLORS[d.name as keyof typeof SPLIT_COLORS],
                }}
              />
              <span className="text-neutral-700">
                {d.name}: <strong className="text-neutral-900">{d.value}%</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Holdings */}
      <div className="mt-4 border-t border-neutral-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Example holdings
        </p>
        <ul className="mt-2 space-y-1.5">
          {portfolio.holdings.map((h) => (
            <li key={h.symbol} className="flex items-center gap-2 text-sm">
              <span className="w-14 shrink-0 font-medium text-neutral-900">
                {h.symbol}
              </span>
              <span className="relative h-2 flex-1 rounded-full bg-neutral-100">
                <span
                  className="absolute left-0 top-0 h-2 rounded-full"
                  style={{
                    width: `${h.weight}%`,
                    backgroundColor: h.symbol === "CASH" ? "#A9B2BD" : NAVY,
                  }}
                />
              </span>
              <span className="w-10 shrink-0 text-right text-neutral-600">
                {h.weight}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-400">
        {portfolio.sourceNote}
      </p>
    </div>
  );
}
