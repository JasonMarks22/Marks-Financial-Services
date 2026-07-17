"use client";

/**
 * Market-insights widget grid — Trending Stocks, Top ETFs, Market
 * Performance, Recent News, Economic Calendar, Fear & Greed. These are NOT
 * wired to the live data layer yet, so every card is fixed sample data and
 * carries its own "Sample data" tag. Real data lands in a later phase.
 */

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { SampleDataTag } from "@/components/ui/SampleDataTag";
import {
  BellIcon,
  CalendarIcon,
  GaugeIcon,
  NewspaperIcon,
  PieChartIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

const TRENDING = [
  { symbol: "NVDA", name: "NVIDIA", change: +2.1 },
  { symbol: "AAPL", name: "Apple", change: -0.3 },
  { symbol: "MSFT", name: "Microsoft", change: +0.8 },
  { symbol: "TSLA", name: "Tesla", change: -1.4 },
];
const ETFS = [
  { symbol: "VOO", name: "Vanguard S&P 500", change: +0.4 },
  { symbol: "QQQ", name: "Invesco QQQ", change: +0.9 },
  { symbol: "SCHD", name: "Schwab Dividend", change: +0.2 },
  { symbol: "VTI", name: "Total US Market", change: +0.5 },
];
const INDEXES = [
  { name: "S&P 500", value: "5,320", change: +0.42 },
  { name: "Nasdaq", value: "17,180", change: +0.78 },
  { name: "Dow Jones", value: "39,100", change: -0.15 },
  { name: "Russell 2000", value: "2,040", change: +0.31 },
];
const NEWS = [
  "Fed holds rates steady; signals patience on cuts",
  "Tech earnings beat expectations across the board",
  "Dividend aristocrats draw inflows amid volatility",
];
const CALENDAR = [
  { when: "Mon", event: "ISM Manufacturing PMI" },
  { when: "Wed", event: "FOMC meeting minutes" },
  { when: "Thu", event: "Initial jobless claims" },
  { when: "Fri", event: "Nonfarm payrolls" },
];

function ChangeText({ value }: { value: number }) {
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

function Widget({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-link" aria-hidden="true">
            {icon}
          </span>
          <p className="text-sm font-bold text-ink">{title}</p>
        </div>
        <SampleDataTag />
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </Card>
  );
}

function QuoteList({
  rows,
}: {
  rows: { symbol: string; name: string; change: number }[];
}) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.symbol} className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0">
            <span className="font-bold text-ink">{r.symbol}</span>{" "}
            <span className="truncate text-muted">{r.name}</span>
          </span>
          <ChangeText value={r.change} />
        </li>
      ))}
    </ul>
  );
}

export function MarketInsights() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Widget title="Trending Stocks" icon={<TrendingUpIcon className="h-5 w-5" />}>
        <QuoteList rows={TRENDING} />
      </Widget>

      <Widget title="Top ETFs" icon={<PieChartIcon className="h-5 w-5" />}>
        <QuoteList rows={ETFS} />
      </Widget>

      <Widget title="Market Performance" icon={<TrendingUpIcon className="h-5 w-5" />}>
        <ul className="space-y-2.5">
          {INDEXES.map((idx) => (
            <li key={idx.name} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">{idx.name}</span>
              <span className="tabular-nums">
                <span className="font-semibold text-ink">{idx.value}</span>{" "}
                <ChangeText value={idx.change} />
              </span>
            </li>
          ))}
        </ul>
      </Widget>

      <Widget title="Recent News" icon={<NewspaperIcon className="h-5 w-5" />}>
        <ul className="space-y-3">
          {NEWS.map((headline) => (
            <li key={headline} className="text-sm leading-6 text-neutral-700">
              {headline}
            </li>
          ))}
        </ul>
      </Widget>

      <Widget title="Economic Calendar" icon={<CalendarIcon className="h-5 w-5" />}>
        <ul className="space-y-2.5">
          {CALENDAR.map((c) => (
            <li key={c.event} className="flex items-center gap-3 text-sm">
              <span className="w-9 shrink-0 rounded-md bg-card-tint px-1.5 py-0.5 text-center text-xs font-semibold text-muted">
                {c.when}
              </span>
              <span className="text-neutral-700">{c.event}</span>
            </li>
          ))}
        </ul>
      </Widget>

      <Widget title="Fear & Greed Index" icon={<GaugeIcon className="h-5 w-5" />}>
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--card-border)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--brand-3)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - 0.64)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-ink">64</span>
              <span className="text-[11px] font-medium text-muted">Greed</span>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <BellIcon className="h-3.5 w-3.5" />
            Updates with live data in a later release
          </p>
        </div>
      </Widget>
    </div>
  );
}
