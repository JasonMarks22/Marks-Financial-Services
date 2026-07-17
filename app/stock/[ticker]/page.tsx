"use client";

/**
 * Single stock / ETF / fund detail page at /stock/[ticker].
 *
 * Matches the app's established market-data pattern (see /compare): the page
 * is a client component that reads the ticker from the URL and fetches through
 * the server-side API routes — the browser never talks to the provider
 * directly. /api/security returns rich detail; /api/history returns the price
 * series for the chart. Every stat shown is a real field the data layer
 * returned; anything null is simply omitted, never guessed.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PriceHistory, SecurityDetail } from "@/lib/marketData/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/ui/Disclaimer";

const CHART_RANGE = "1y";

const TYPE_LABELS: Record<string, string> = {
  EQUITY: "Stock",
  ETF: "ETF",
  MUTUALFUND: "Mutual fund",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function fmtPrice(value: number, currency: string): string {
  try {
    return value.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** 2,340,000,000,000 → "$2.34T" etc. */
function fmtMarketCap(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export default function StockDetailPage() {
  const params = useParams<{ ticker: string }>();
  // Route segments can be string | string[]; normalize, uppercase, trim.
  const raw = Array.isArray(params.ticker) ? params.ticker[0] : params.ticker;
  const ticker = (raw ?? "").trim().toUpperCase();

  const [detail, setDetail] = useState<SecurityDetail | null>(null);
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Detail is required; history is best-effort (a valid security may still
    // have no usable chart data — we show the page without the chart then).
    // All state changes happen inside this async callback so nothing runs
    // synchronously in the effect body.
    (async () => {
      if (!ticker) {
        if (!cancelled) {
          setLoading(false);
          setError("No ticker symbol was provided.");
        }
        return;
      }

      setLoading(true);
      setError(null);
      setDetail(null);
      setHistory(null);

      try {
        const [detailRes, historyRes] = await Promise.all([
          fetch(`/api/security?symbol=${encodeURIComponent(ticker)}`),
          fetch(
            `/api/history?symbol=${encodeURIComponent(ticker)}&range=${CHART_RANGE}`,
          ),
        ]);

        const detailJson = await detailRes.json();
        if (cancelled) return;
        if (!detailRes.ok) {
          throw new Error(detailJson.error ?? "Couldn't load this security.");
        }
        setDetail(detailJson);

        const historyJson = await historyRes.json();
        if (cancelled) return;
        setHistory(historyRes.ok ? historyJson : null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Couldn't load this security.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return (
    <main className="flex-1 bg-surface">
      <Container className="py-12 sm:py-16">
        {loading ? (
          <LoadingState ticker={ticker} />
        ) : error || !detail ? (
          <NotFoundState ticker={ticker} message={error} />
        ) : (
          <SecurityView detail={detail} history={history} />
        )}
      </Container>
    </main>
  );
}

/* ------------------------------------------------------------------------ */

function SecurityView({
  detail,
  history,
}: {
  detail: SecurityDetail;
  history: PriceHistory | null;
}) {
  const up = detail.change >= 0;

  const chartData = useMemo(
    () =>
      (history?.points ?? []).map((p) => ({
        date: p.date,
        close: p.close,
      })),
    [history],
  );

  // Only stats the provider actually returned (non-null) are shown.
  const stats: { label: string; value: string }[] = [];
  stats.push({ label: "Type", value: typeLabel(detail.type) });
  if (detail.marketCap !== null)
    stats.push({ label: "Market cap", value: fmtMarketCap(detail.marketCap) });
  if (detail.peRatio !== null)
    stats.push({ label: "P/E ratio", value: detail.peRatio.toFixed(2) });
  if (detail.dividendYield !== null)
    stats.push({
      label: "Dividend yield",
      value: `${detail.dividendYield.toFixed(2)}%`,
    });
  if (detail.expenseRatio !== null)
    stats.push({
      label: "Expense ratio",
      value: `${detail.expenseRatio.toFixed(2)}%`,
    });
  if (detail.category !== null)
    stats.push({ label: "Fund category", value: detail.category });
  if (detail.sector !== null)
    stats.push({ label: "Sector", value: detail.sector });
  if (detail.fiftyTwoWeekHigh !== null)
    stats.push({
      label: "52-week high",
      value: fmtPrice(detail.fiftyTwoWeekHigh, detail.currency),
    });
  if (detail.fiftyTwoWeekLow !== null)
    stats.push({
      label: "52-week low",
      value: fmtPrice(detail.fiftyTwoWeekLow, detail.currency),
    });

  return (
    <div>
      {/* Header: name, symbol, type, price, day change */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {detail.symbol}
            </h1>
            <Badge tone={detail.type === "ETF" ? "blue" : "green"}>
              {typeLabel(detail.type)}
            </Badge>
          </div>
          <p className="mt-1 text-lg text-muted">{detail.name}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-ink sm:text-4xl">
            {fmtPrice(detail.price, detail.currency)}
          </p>
          <p
            className={`mt-1 text-sm font-semibold tabular-nums ${
              up ? "text-link" : "text-red-600"
            }`}
          >
            {up ? "▲" : "▼"} {detail.change >= 0 ? "+" : ""}
            {detail.change.toFixed(2)} ({detail.changePercent >= 0 ? "+" : ""}
            {detail.changePercent.toFixed(2)}%) today
          </p>
        </div>
      </div>

      {/* Price chart */}
      <Card className="mt-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Price · past year</h2>
        </div>
        {chartData.length > 0 ? (
          <div className="mt-4 h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="stockArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-3)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand-3)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted)"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={60}
                />
                <YAxis
                  stroke="var(--muted)"
                  tick={{ fontSize: 11 }}
                  width={64}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => fmtPrice(Number(v), detail.currency)}
                />
                <Tooltip
                  formatter={(value) => [
                    fmtPrice(Number(value), detail.currency),
                    "Close",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#stockArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">
            Price history isn&rsquo;t available for this symbol right now.
          </p>
        )}
      </Card>

      {/* Key stats */}
      <Card className="mt-6 p-6">
        <h2 className="text-lg font-bold text-ink">Key stats</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs font-medium text-muted">{s.label}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-ink">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Data source + disclaimer */}
      <div className="mt-6 space-y-2">
        <p className="text-xs leading-5 text-muted">
          Market data provided by Yahoo Finance. Quotes may be delayed (not
          real-time) and can be incomplete. Shown for educational purposes.
        </p>
        <Disclaimer />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href={`/compare?a=${encodeURIComponent(detail.symbol)}`} variant="secondary">
          Compare with another security
        </Button>
        <Button href="/" variant="ghost">
          Back to home
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function LoadingState({ ticker }: { ticker: string }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-9 w-40 rounded-lg bg-card-tint" />
      <div className="mt-3 h-5 w-64 rounded bg-card-tint" />
      <div className="mt-8 h-80 w-full rounded-2xl bg-card-tint" />
      <div className="mt-6 h-40 w-full rounded-2xl bg-card-tint" />
      <span className="sr-only">Loading data for {ticker || "security"}…</span>
    </div>
  );
}

function NotFoundState({
  ticker,
  message,
}: {
  ticker: string;
  message?: string | null;
}) {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <Badge tone="neutral">Not found</Badge>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">
        We couldn&rsquo;t find{" "}
        {ticker ? <span className="text-link">{ticker}</span> : "that symbol"}
      </h1>
      <p className="mt-3 text-muted">
        {message
          ? message
          : "That ticker doesn't match a security we can look up."}{" "}
        Double-check the symbol, or search from the homepage.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/#search">Search securities</Button>
        <Button href="/" variant="secondary">
          Back to home
        </Button>
      </div>
    </div>
  );
}
