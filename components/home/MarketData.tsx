"use client";

/**
 * Homepage "Market Trends": an interactive market chart plus category tiles.
 *
 *   - The big chart shows one GROUP of securities as color-coded percent-change
 *     lines over a selectable RANGE (Today intraday, 1W, 1M, 3M, 1Y, 5Y). Group
 *     tabs (and the clickable category cards below) swap which group is shown;
 *     the range controls apply to whichever group is loaded.
 *   - Below: Major ETFs, Top gainers today, and Major stocks cards, each with
 *     last-month sparklines. Clicking a card loads that group into the chart.
 *
 * All data is REAL, from /api/market (quotes + 1-month history, which also
 * seeds the chart's default view) and /api/market/series (group + range on
 * demand; "Today" uses intraday bars). Delayed, not real-time. Fetched results
 * are cached so switching back is instant; the 1W view is derived from the 1M
 * series. Nothing is fabricated — symbols without data are simply dropped.
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

type GroupKey = "indexes" | "etfs" | "gainers" | "stocks";
type RangeKey = "today" | "1w" | "1mo" | "3mo" | "1y" | "5y";

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "indexes", label: "Market Indexes" },
  { key: "etfs", label: "Major ETFs" },
  { key: "gainers", label: "Top Gainers Today" },
  { key: "stocks", label: "Major Stocks" },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "1w", label: "1W" },
  { key: "1mo", label: "1M" },
  { key: "3mo", label: "3M" },
  { key: "1y", label: "1Y" },
  { key: "5y", label: "5Y" },
];

// Distinct colors for up to eight lines.
const PALETTE = [
  "#1B4332",
  "#2563EB",
  "#C2410C",
  "#7C3AED",
  "#0D9488",
  "#DB2777",
  "#65A30D",
  "#0891B2",
];

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

interface SeriesItem {
  symbol: string;
  label?: string;
  points: PricePoint[];
}

function fmtPrice(value: number, currency = "USD"): string {
  try {
    return value.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function pctText(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/** Percent change across a history series (first -> last close), or null. */
function seriesChangePct(points: PricePoint[]): number | null {
  if (!points || points.length < 2) return null;
  const first = points[0].close;
  const last = points[points.length - 1].close;
  if (!first) return null;
  return ((last - first) / first) * 100;
}

/** Slice a daily series to its last ~7 calendar days (for the derived 1W view). */
function sliceLastWeek(points: PricePoint[]): PricePoint[] {
  if (points.length === 0) return points;
  const lastDay = points[points.length - 1].date.slice(0, 10);
  const cutoff = new Date(new Date(lastDay).getTime() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const pts = points.filter((p) => p.date.slice(0, 10) >= cutoff);
  return pts.length > 1 ? pts : points.slice(-6);
}

function fetchKey(group: GroupKey, range: RangeKey): string {
  // 1W reuses the 1M fetch and is sliced client-side.
  return `${group}:${range === "1w" ? "1mo" : range}`;
}

export function MarketData() {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [group, setGroup] = useState<GroupKey>("indexes");

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

  // Seed the chart cache with each group's 1-month series (already loaded for
  // the tiles), so the default view and 1W need no extra request.
  const toSeries = (items: Quote[]): SeriesItem[] =>
    items
      .map((i) => ({ symbol: i.symbol, label: i.name, points: i.history }))
      .filter((s) => s.points.length > 1);

  const seed: Record<string, SeriesItem[]> = {
    "indexes:1mo": data.indexes.items
      .map((i) => ({ symbol: i.symbol, label: i.label, points: i.history }))
      .filter((s) => s.points.length > 1),
    "etfs:1mo": toSeries(data.etfs.items),
    "gainers:1mo": toSeries(data.gainers.items),
    "stocks:1mo": toSeries(data.stocks.items),
  };

  return (
    <div className="space-y-5">
      <MarketChart group={group} setGroup={setGroup} seed={seed} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SparkCard
          icon={<BriefcaseIcon className="h-5 w-5" />}
          title="Major ETFs"
          section={data.etfs}
          active={group === "etfs"}
          onSelect={() => setGroup("etfs")}
        />
        <SparkCard
          icon={<TrendingUpIcon className="h-5 w-5" />}
          title="Top gainers today"
          section={data.gainers}
          active={group === "gainers"}
          onSelect={() => setGroup("gainers")}
        />
        <SparkCard
          icon={<BarChartIcon className="h-5 w-5" />}
          title="Major stocks"
          section={data.stocks}
          active={group === "stocks"}
          onSelect={() => setGroup("stocks")}
        />
      </div>
    </div>
  );
}

/* ---- The interactive big chart ----------------------------------------- */

function MarketChart({
  group,
  setGroup,
  seed,
}: {
  group: GroupKey;
  setGroup: (g: GroupKey) => void;
  seed: Record<string, SeriesItem[]>;
}) {
  const [range, setRange] = useState<RangeKey>("1mo");
  const [cache, setCache] = useState<Record<string, SeriesItem[]>>(seed);

  const key = fetchKey(group, range);
  const isToday = range === "today";

  // Fetch the series for the current group/range on demand. The early return
  // means re-runs after a cache update are harmless (no refetch, no loop).
  useEffect(() => {
    const k = fetchKey(group, range);
    if (cache[k]) return; // already have it (incl. 1W via 1M)

    let cancelled = false;
    const fetchRange = range === "1w" ? "1mo" : range;
    (async () => {
      try {
        const res = await fetch(
          `/api/market/series?group=${group}&range=${fetchRange}`,
        );
        const json = await res.json();
        if (cancelled) return;
        setCache((prev) => ({
          ...prev,
          [k]: res.ok && Array.isArray(json.series) ? json.series : [],
        }));
      } catch {
        if (!cancelled) setCache((prev) => ({ ...prev, [k]: [] }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [group, range, cache]);

  const raw = cache[key];
  const isLoading = raw === undefined;

  // Slice for 1W, drop empty series, then normalize each to % change.
  const displaySeries = useMemo(() => {
    const source = raw ?? [];
    const sliced =
      range === "1w"
        ? source.map((s) => ({ ...s, points: sliceLastWeek(s.points) }))
        : source;
    return sliced.filter((s) => s.points.length > 1);
  }, [raw, range]);

  const chartData = useMemo(() => {
    const rows = new Map<string, Record<string, number | string>>();
    for (const s of displaySeries) {
      const first = s.points[0].close;
      if (!first) continue;
      for (const p of s.points) {
        const row = rows.get(p.date) ?? { date: p.date };
        row[s.symbol] = ((p.close - first) / first) * 100;
        rows.set(p.date, row);
      }
    }
    return [...rows.values()].sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
  }, [displaySeries]);

  const colorFor = (symbol: string) => {
    const i = displaySeries.findIndex((s) => s.symbol === symbol);
    return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
  };

  const formatX = (v: string) =>
    isToday
      ? new Date(v).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : v;

  const rangeLabel =
    isToday ? "today" : `past ${RANGES.find((r) => r.key === range)?.label}`;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-link" aria-hidden="true">
            <LineChartIcon className="h-5 w-5" />
          </span>
          <p className="text-base font-bold text-ink">
            {GROUPS.find((g) => g.key === group)?.label}
          </p>
          <span className="text-xs text-muted">
            {isToday ? "% change from open" : "% change"}
          </span>
        </div>

        {/* Range selector */}
        <div
          role="group"
          aria-label="Chart range"
          className="flex flex-wrap gap-1 rounded-lg border border-edge bg-card-tint p-1"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                range === r.key
                  ? "bg-primary text-white shadow-soft"
                  : "text-neutral-600 hover:text-link"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Group tabs */}
      <div
        role="group"
        aria-label="Chart group"
        className="mt-4 flex flex-wrap gap-2"
      >
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGroup(g.key)}
            aria-pressed={group === g.key}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              group === g.key
                ? "border-accent bg-accent/15 text-link"
                : "border-edge text-neutral-600 hover:border-accent hover:text-link"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative mt-4 h-72 w-full sm:h-80">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">Loading {rangeLabel}…</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-muted">
              {isToday
                ? "No session data yet — the market may be closed. Try another range."
                : "No data available for this selection right now."}
            </p>
          </div>
        ) : (
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
                tickFormatter={formatX}
              />
              <YAxis
                stroke="var(--muted)"
                tick={{ fontSize: 11 }}
                width={48}
                tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
              />
              <Tooltip
                labelFormatter={(label) => formatX(String(label))}
                formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name]}
              />
              {displaySeries.map((s) => (
                <Line
                  key={s.symbol}
                  type="monotone"
                  dataKey={s.symbol}
                  name={s.label ?? s.symbol}
                  stroke={colorFor(s.symbol)}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend + per-security change over the selected range */}
      {!isLoading && displaySeries.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {displaySeries.map((s) => {
            const chg = seriesChangePct(s.points);
            const lastClose = s.points[s.points.length - 1]?.close;
            return (
              <Link
                key={s.symbol}
                href={`/stock/${s.symbol}`}
                className="rounded-xl border border-edge bg-card-tint p-3 transition hover:border-accent"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorFor(s.symbol) }}
                  />
                  <span className="truncate text-xs font-semibold text-ink">
                    {s.symbol}
                  </span>
                </span>
                {typeof lastClose === "number" && (
                  <span className="mt-1 block text-sm font-bold tabular-nums text-ink">
                    {fmtPrice(lastClose)}
                  </span>
                )}
                {chg !== null && (
                  <span
                    className={`block text-xs font-semibold tabular-nums ${
                      chg >= 0 ? "text-link" : "text-red-600"
                    }`}
                  >
                    {pctText(chg)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] text-neutral-400">
        Percent change {rangeLabel}. Market indexes shown via tracking ETFs (SPY,
        QQQ, DIA, IWM). Data delayed, not real-time.
      </p>
    </Card>
  );
}

/* ---- Category cards (also act as group selectors) ---------------------- */

function SparkCard({
  icon,
  title,
  section,
  active,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  section: Section<Quote>;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={`flex flex-col p-5 ${
        active ? "ring-2 ring-accent" : ""
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="flex w-full items-center gap-2 text-left"
        title={`Show ${title} in the chart`}
      >
        <span className="text-link" aria-hidden="true">
          {icon}
        </span>
        <span className="text-sm font-bold text-ink">{title}</span>
        <span
          className={`ml-auto text-xs font-semibold ${
            active ? "text-link" : "text-muted"
          }`}
        >
          {active ? "In chart" : "View in chart"}
        </span>
      </button>

      {section.ok && section.items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {section.items.map((q) => {
            const chg = seriesChangePct(q.history);
            const up = (chg ?? q.changePercent) >= 0;
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
                <span
                  className={`w-16 text-right text-sm font-semibold tabular-nums ${
                    up ? "text-link" : "text-red-600"
                  }`}
                >
                  {pctText(chg ?? q.changePercent)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Temporarily unavailable. Please try again shortly.
        </p>
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
            stroke={up ? "var(--brand-3)" : "#dc2626"}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
