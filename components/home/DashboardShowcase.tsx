"use client";

/**
 * Horizontally-scrollable showcase of the analytics UI. Every panel uses
 * fixed sample data and the whole strip carries a sample-data label.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { SampleDataTag } from "@/components/ui/SampleDataTag";

const PERF = [100, 108, 104, 116, 122, 119, 131, 128, 140, 146, 152, 149].map(
  (v, i) => ({ i, v }),
);
const DIVIDENDS = [1.8, 2.0, 2.1, 2.4, 2.6, 2.9, 3.1, 3.4].map((v, i) => ({
  i,
  v,
}));
const ALLOC = [
  { name: "Stocks", value: 60, color: "var(--brand)" },
  { name: "Bonds", value: 25, color: "var(--brand-3)" },
  { name: "Intl", value: 10, color: "#74c0dc" },
  { name: "Cash", value: 5, color: "#a8d0db" },
];
const RISK = [
  { label: "Volatility", value: "12.4%" },
  { label: "Max drawdown", value: "-18.2%" },
  { label: "Sharpe ratio", value: "0.94" },
  { label: "Beta", value: "0.88" },
];

export function DashboardShowcase() {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <SampleDataTag />
      </div>
      <div className="-mx-6 overflow-x-auto px-6 pb-4 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14">
        <div className="flex w-max gap-5">
          <Panel title="Performance vs. benchmark" width="w-[340px]">
            <div className="h-40" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PERF} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                  <Line type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-muted">
              Growth of a sample balanced portfolio over 12 months.
            </p>
          </Panel>

          <Panel title="Portfolio allocation" width="w-[300px]">
            <div className="flex items-center gap-4">
              <div className="h-32 w-32 shrink-0" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ALLOC} dataKey="value" innerRadius={34} outerRadius={58} strokeWidth={0} isAnimationActive={false}>
                      {ALLOC.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5">
                {ALLOC.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 text-xs text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                    {s.name} · {s.value}%
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel title="Risk metrics" width="w-[300px]">
            <div className="grid grid-cols-2 gap-3">
              {RISK.map((m) => (
                <div key={m.label} className="rounded-xl bg-card-tint px-3 py-2.5">
                  <p className="text-[11px] font-medium text-muted">{m.label}</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">{m.value}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Dividend history" width="w-[300px]">
            <div className="h-32" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DIVIDENDS} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                  <Bar dataKey="v" fill="var(--brand-3)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-muted">
              Annual dividends per share trending upward (illustrative).
            </p>
          </Panel>

          <Panel title="Growth of $10,000" width="w-[340px]">
            <div className="h-40" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PERF} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="showcaseArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand-3)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--brand-3)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2} fill="url(#showcaseArea)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-muted">
              Hypothetical compounding of a $10,000 starting balance.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  width,
  children,
}: {
  title: string;
  width: string;
  children: ReactNode;
}) {
  return (
    <Card className={`${width} shrink-0 p-5`}>
      <p className="text-sm font-bold text-ink">{title}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}
