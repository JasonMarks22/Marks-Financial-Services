"use client";

/**
 * Hero dashboard preview — a realistic product mock built from the same
 * chart components the real tools use. ALL numbers here are static sample
 * data (fixed arrays, so server and client render identically) and the card
 * is visibly labeled as such.
 */

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SampleDataTag } from "@/components/ui/SampleDataTag";

/* Illustrative 24-month portfolio value series (thousands of dollars). */
const GROWTH = [
  100, 102, 101, 104, 107, 106, 109, 112, 111, 115, 118, 117,
  120, 119, 122, 125, 124, 127, 126, 129, 132, 131, 134, 137,
].map((v, i) => ({ month: i, value: v }));

const ALLOCATION = [
  { name: "US stocks", value: 55, color: "var(--brand)" },
  { name: "International", value: 20, color: "var(--brand-3)" },
  { name: "Bonds", value: 20, color: "#74c0dc" },
  { name: "Cash", value: 5, color: "#a8d0db" },
];

const WATCHLIST = [
  { symbol: "VOO", name: "Vanguard S&P 500", price: "512.34", change: +0.42 },
  { symbol: "AAPL", name: "Apple Inc.", price: "231.10", change: -0.31 },
  { symbol: "SCHD", name: "Schwab US Dividend", price: "27.90", change: +0.18 },
];

const KPIS = [
  { label: "Portfolio value", value: "$137,200", note: "+12.4% YTD" },
  { label: "Annual dividends", value: "$3,210", note: "2.3% yield" },
  { label: "Avg expense ratio", value: "0.06%", note: "low cost" },
];

export function HeroDashboard() {
  return (
    <Card className="p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">Portfolio overview</p>
        <SampleDataTag />
      </div>

      {/* KPI tiles */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-card-tint px-3 py-2.5">
            <p className="truncate text-[11px] font-medium text-muted">
              {kpi.label}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-ink sm:text-base">
              {kpi.value}
            </p>
            <p className="text-[11px] font-medium text-link">{kpi.note}</p>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      <div className="mt-4 h-36 w-full sm:h-40" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={GROWTH} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="heroGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-3)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--brand-3)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--brand)"
              strokeWidth={2}
              fill="url(#heroGrowth)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Allocation + watchlist */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted">Allocation</p>
          <div className="mt-1 flex items-center gap-3">
            <div className="h-24 w-24 shrink-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ALLOCATION}
                    dataKey="value"
                    innerRadius={26}
                    outerRadius={44}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {ALLOCATION.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1">
              {ALLOCATION.map((slice) => (
                <li key={slice.name} className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  {slice.name} · {slice.value}%
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted">Watchlist</p>
          <ul className="mt-1 space-y-1.5">
            {WATCHLIST.map((row) => (
              <li key={row.symbol} className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-ink">{row.symbol}</span>
                <span className="text-right text-xs tabular-nums text-muted">
                  ${row.price}{" "}
                  <span
                    className={
                      row.change >= 0 ? "font-semibold text-link" : "font-semibold text-red-600"
                    }
                  >
                    {row.change >= 0 ? "+" : ""}
                    {row.change.toFixed(2)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
