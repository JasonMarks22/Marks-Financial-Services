"use client";

/**
 * Homepage market-data lead: live graphics from the app's own data layer.
 *
 *   - Market performance: index-proxy ETFs (SPY/QQQ/DIA/IWM) + a real S&P 500
 *     sparkline (via the existing /api/history route).
 *   - Major ETFs: live quotes for a curated ETF list.
 *   - Top gainers today: a real ranking feed (Yahoo "day_gainers" screener).
 *   - Major stocks: live quotes for a curated stock list.
 *
 * Everything here is REAL data fetched on mount from /api/market and
 * /api/history. Each section degrades to an honest "unavailable" note if its
 * feed fails; nothing is ever fabricated, so there is no sample-data tag.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
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

function fmtPrice(value: number, currency = "USD"): string {
  try {
    return value.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function ChangePct({ value }: { value: number }) {
  return (
    <span
      className={
        value >= 0 ? "font-semibold text-link" : "font-semibold text-red-600"
      }
    >
      {value >= 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function MarketData() {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [spark, setSpark] = useState<PricePoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [marketRes, sparkRes] = await Promise.all([
          fetch("/api/market"),
          fetch("/api/history?symbol=SPY&range=3mo"),
        ]);
        if (cancelled) return;
        if (!marketRes.ok) throw new Error("market");
        const market = (await marketRes.json()) as MarketSnapshot;
        if (cancelled) return;
        setData(market);
        if (sparkRes.ok) {
          const hist = await sparkRes.json();
          if (!cancelled) setSpark(hist?.points ?? null);
        }
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

  if (loading) return <LoadingGrid />;

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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {/* Market performance (with sparkline) */}
      <Card className="flex flex-col p-5 md:col-span-2 xl:col-span-1">
        <WidgetHeader
          icon={<LineChartIcon className="h-5 w-5" />}
          title="Market performance"
        />
        <div className="mt-3 h-14 w-full" aria-hidden="true">
          {spark && spark.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mktSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-3)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand-3)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Tooltip
                  formatter={(v) => [fmtPrice(Number(v)), "SPY close"]}
                  labelFormatter={() => ""}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#mktSpark)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
        {data.indexes.ok && data.indexes.items.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {data.indexes.items.map((idx) => (
              <li key={idx.symbol} className="flex items-center justify-between gap-2 text-sm">
                <Link
                  href={`/stock/${idx.symbol}`}
                  className="min-w-0 truncate text-muted hover:text-link hover:underline underline-offset-2"
                >
                  {idx.label}{" "}
                  <span className="text-xs text-neutral-400">{idx.symbol}</span>
                </Link>
                <span className="tabular-nums">
                  <span className="font-semibold text-ink">
                    {fmtPrice(idx.price, idx.currency)}
                  </span>{" "}
                  <ChangePct value={idx.changePercent} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Unavailable />
        )}
        <p className="mt-3 text-[11px] text-neutral-400">
          Shown via index-tracking ETFs (SPY, QQQ, DIA, IWM).
        </p>
      </Card>

      <QuoteCard
        icon={<BriefcaseIcon className="h-5 w-5" />}
        title="Major ETFs"
        section={data.etfs}
      />
      <QuoteCard
        icon={<TrendingUpIcon className="h-5 w-5" />}
        title="Top gainers today"
        section={data.gainers}
      />
      <QuoteCard
        icon={<BarChartIcon className="h-5 w-5" />}
        title="Major stocks"
        section={data.stocks}
      />
    </div>
  );
}

function QuoteCard({
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
      <WidgetHeader icon={icon} title={title} />
      {section.ok && section.items.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {section.items.map((q) => (
            <li key={q.symbol} className="flex items-center justify-between gap-2 text-sm">
              <Link
                href={`/stock/${q.symbol}`}
                className="min-w-0 hover:underline underline-offset-2"
              >
                <span className="font-bold text-ink">{q.symbol}</span>{" "}
                <span className="truncate text-muted">{q.name}</span>
              </Link>
              <ChangePct value={q.changePercent} />
            </li>
          ))}
        </ul>
      ) : (
        <Unavailable />
      )}
    </Card>
  );
}

function WidgetHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-link" aria-hidden="true">
        {icon}
      </span>
      <p className="text-sm font-bold text-ink">{title}</p>
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

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="h-4 w-32 rounded bg-card-tint" />
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-4 w-full rounded bg-card-tint" />
            ))}
          </div>
          <span className="sr-only">Loading market data…</span>
        </Card>
      ))}
    </div>
  );
}
