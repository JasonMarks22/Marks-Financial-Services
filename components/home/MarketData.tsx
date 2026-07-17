"use client";

/**
 * Homepage "Market Trends" lead: live graphics from the app's own data layer.
 *
 *   - Market performance (the star): each major index's LAST MONTH plotted as
 *     percent change (all starting at 0%) on one color-coded, legended chart,
 *     shown via index-proxy ETFs (SPY/QQQ/DIA/IWM).
 *   - Major ETFs, Top gainers today, Major stocks: each listed item gets a
 *     last-month sparkline, colored green/red by its actual monthly movement.
 *
 * Everything here is REAL data fetched on mount from /api/market (quotes +
 * last-month history). Each section degrades to an honest "unavailable" note
 * if its feed fails; nothing is ever fabricated, so there is no sample tag.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "@/lib/marketData/types";
import { Card } from "@/components/ui/Card";
import {
  BarChartIcon,
  BriefcaseIcon,
  LineChartIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  history: PricePoint[];
}
type IndexQuote = Quote & { label: string };

interface Section<T> {
  ok: boolean;
  items: T[];
}
interface MarketSnapshot {
  indexes: Section<IndexQuote>;
  etfs: Section<Quote>;
  stocks: Section<Quote>;
  gainers: Section<Quote>;
}

// One distinct color per index line (also drives the legend tiles).
const INDEX_COLORS: Record<string, string> = {
  SPY: "#1B4332", // S&P 500 — brand green
  QQQ: "#2563EB", // Nasdaq 100 — blue
  DIA: "#C2410C", // Dow 30 — amber
  IWM: "#7C3AED", // Russell 2000 — violet
};

const UP = "var(--brand-3)"; // green
const DOWN = "#dc2626"; // red-600

function fmtPrice(value: number, currency = "USD"): string {
  try {
    return value.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

/** Percent change across a history series (first close -> last close), or null. */
function monthChangePct(history: PricePoint[]): number | null {
  if (!history || history.length < 2) return null;
  const first = history[0].close;
  const last = history[history.length - 1].close;
  if (!first) return null;
  return ((last - first) / first) * 100;
}

function ChangePct({
  value,
  title,
}: {
  value: number;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`tabular-nums ${
        value >= 0 ? "font-semibold text-link" : "font-semibold text-red-600"
      }`}
    >
      {value >= 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function MarketData() {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/market");
        if (cancelled) return;
        if (!res.ok) throw new Error("market");
        const market = (await res.json()) as MarketSnapshot;
        if (!cancelled) setData(market);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted">
          Market data is temporarily unavailable. Please try again shortly.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <MarketPerformance indexes={data.indexes} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SparkCard
          icon={<BriefcaseIcon className="h-5 w-5" />}
          title="Major ETFs"
          section={data.etfs}
        />
        <SparkCard
          icon={<TrendingUpIcon className="h-5 w-5" />}
          title="Top gainers today"
          section={data.gainers}
        />
        <SparkCard
          icon={<BarChartIcon className="h-5 w-5" />}
          title="Major stocks"
          section={data.stocks}
        />
      </div>
    </div>
  );
}

/* ---- Market performance: the large multi-line % chart ------------------- */

function MarketPerformance({ indexes }: { indexes: Section<IndexQuote> }) {
  const withHistory = indexes.items.filter((i) => i.history.length > 1);

  // Merge every index's history into one dataset, each as % change from its own
  // first close, so different price levels compare on a single 0%-based axis.
  const chartData = useMemo(() => {
    const rows = new Map<string, Record<string, number | string>>();
    for (const idx of withHistory) {
      const first = idx.history[0].close;
      if (!first) continue;
      for (const p of idx.history) {
        const row = rows.get(p.date) ?? { date: p.date };
        row[idx.symbol] = ((p.close - first) / first) * 100;
        rows.set(p.date, row);
      }
    }
    return [...rows.values()].sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexes]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="text-link" aria-hidden="true">
          <LineChartIcon className="h-5 w-5" />
        </span>
        <p className="text-base font-bold text-ink">Market performance</p>
        <span className="ml-auto text-xs text-muted">% change, past month</span>
      </div>

      {indexes.ok && chartData.length > 0 ? (
        <>
          <div className="mt-4 h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted)"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={48}
                />
                <YAxis
                  stroke="var(--muted)"
                  tick={{ fontSize: 11 }}
                  width={48}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name]}
                />
                {withHistory.map((idx) => (
                  <Line
                    key={idx.symbol}
                    type="monotone"
                    dataKey={idx.symbol}
                    name={idx.label}
                    stroke={INDEX_COLORS[idx.symbol] ?? "var(--brand)"}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend + quotes: one tile per index (doubles as the color legend). */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {indexes.items.map((idx) => {
              const mchg = monthChangePct(idx.history);
              return (
                <Link
                  key={idx.symbol}
                  href={`/stock/${idx.symbol}`}
                  className="rounded-xl border border-edge bg-card-tint p-3 transition hover:border-accent"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: INDEX_COLORS[idx.symbol] ?? "var(--brand)" }}
                    />
                    <span className="truncate text-xs font-semibold text-ink">
                      {idx.label}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm font-bold tabular-nums text-ink">
                    {fmtPrice(idx.price, idx.currency)}
                  </span>
                  {mchg !== null ? (
                    <ChangePct value={mchg} title="Change over the past month" />
                  ) : (
                    <ChangePct
                      value={idx.changePercent}
                      title="Today's change (past-month history unavailable)"
                    />
                  )}
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-neutral-400">
            Shown via index-tracking ETFs (SPY, QQQ, DIA, IWM); lines are percent
            change over the past month.
          </p>
        </>
      ) : (
        <Unavailable />
      )}
    </Card>
  );
}

/* ---- Sparkline list cards ---------------------------------------------- */

function SparkCard({
  icon,
  title,
  section,
}: {
  icon: React.ReactNode;
  title: string;
  section: Section<Quote>;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2">
        <span className="text-link" aria-hidden="true">
          {icon}
        </span>
        <p className="text-sm font-bold text-ink">{title}</p>
      </div>
      {section.ok && section.items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {section.items.map((q) => {
            const mchg = monthChangePct(q.history);
            const up = (mchg ?? q.changePercent) >= 0;
            return (
              <li key={q.symbol} className="flex items-center gap-3">
                <Link
                  href={`/stock/${q.symbol}`}
                  className="min-w-0 flex-1 hover:underline underline-offset-2"
                >
                  <span className="block truncate text-sm">
                    <span className="font-bold text-ink">{q.symbol}</span>{" "}
                    <span className="text-muted">{q.name}</span>
                  </span>
                </Link>
                <Sparkline history={q.history} up={up} />
                {mchg !== null ? (
                  <ChangePct
                    value={mchg}
                    title="Change over the past month"
                  />
                ) : (
                  <ChangePct
                    value={q.changePercent}
                    title="Today's change (past-month history unavailable)"
                  />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Unavailable />
      )}
      <p className="mt-4 text-[11px] text-neutral-400">
        Sparklines and change shown over the past month.
      </p>
    </Card>
  );
}

function Sparkline({ history, up }: { history: PricePoint[]; up: boolean }) {
  if (!history || history.length < 2) {
    return <div className="h-8 w-20 shrink-0" aria-hidden="true" />;
  }
  return (
    <div className="h-8 w-20 shrink-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 3, right: 0, left: 0, bottom: 3 }}>
          <Line
            type="monotone"
            dataKey="close"
            stroke={up ? UP : DOWN}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Unavailable() {
  return (
    <p className="mt-4 text-sm text-muted">
      Temporarily unavailable. Please try again shortly.
    </p>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="h-4 w-40 rounded bg-card-tint" />
        <div className="mt-4 h-72 w-full rounded-xl bg-card-tint sm:h-80" />
      </Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="h-4 w-32 rounded bg-card-tint" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-6 w-full rounded bg-card-tint" />
              ))}
            </div>
          </Card>
        ))}
      </div>
      <span className="sr-only">Loading market data…</span>
    </div>
  );
}
