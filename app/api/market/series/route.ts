/**
 * GET /api/market/series?group=indexes|etfs|stocks|gainers&range=today|1mo|3mo|1y|5y
 *
 * Read-only. Returns each security in the requested group with its price
 * history over the requested range, for the homepage's interactive market
 * chart. Daily ranges reuse getHistoriesForSymbols; "today" uses the intraday
 * helper. Top Gainers resolve from the real day_gainers screener. Symbols
 * without usable history are dropped (never fabricated); the client normalizes
 * points to percent change. (The "1 week" view is derived client-side from the
 * 1-month series, so it isn't a range here.)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getHistoriesForSymbols,
  getIntradayHistory,
  getTopGainers,
} from "@/lib/marketData/provider";
import type { HistoryRange, PricePoint } from "@/lib/marketData/types";

const INDEX_PROXIES: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow 30" },
  { symbol: "IWM", label: "Russell 2000" },
];
const MAJOR_ETFS = ["VOO", "QQQ", "SCHD", "VTI", "IWM", "AGG"];
const MAJOR_STOCKS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "JPM"];

const DAILY_RANGES: HistoryRange[] = ["1mo", "3mo", "1y", "5y"];

export const revalidate = 60;

interface SeriesItem {
  symbol: string;
  label?: string;
  points: PricePoint[];
}

export async function GET(request: NextRequest) {
  const group = request.nextUrl.searchParams.get("group") ?? "indexes";
  const range = request.nextUrl.searchParams.get("range") ?? "1mo";

  // Resolve the group's members (with display labels where we have them).
  let entries: { symbol: string; label?: string }[];
  if (group === "indexes") {
    entries = INDEX_PROXIES;
  } else if (group === "etfs") {
    entries = MAJOR_ETFS.map((symbol) => ({ symbol }));
  } else if (group === "stocks") {
    entries = MAJOR_STOCKS.map((symbol) => ({ symbol }));
  } else if (group === "gainers") {
    try {
      const gainers = await getTopGainers(6);
      entries = gainers.map((q) => ({ symbol: q.symbol, label: q.name }));
    } catch {
      entries = [];
    }
  } else {
    return NextResponse.json({ error: "Unknown group." }, { status: 400 });
  }

  if (entries.length === 0) {
    return NextResponse.json({ group, range, series: [] });
  }

  const symbols = entries.map((e) => e.symbol);
  const pointsBySymbol: Record<string, PricePoint[]> = {};

  if (range === "today") {
    const results = await Promise.allSettled(
      symbols.map((s) => getIntradayHistory(s)),
    );
    results.forEach((r, i) => {
      if (r.status === "fulfilled") pointsBySymbol[symbols[i]] = r.value.points;
    });
  } else if (DAILY_RANGES.includes(range as HistoryRange)) {
    try {
      const results = await getHistoriesForSymbols(
        symbols,
        range as HistoryRange,
      );
      for (const r of results) {
        if (r.ok && !r.isCash) pointsBySymbol[r.symbol] = r.points;
      }
    } catch {
      /* Leave empty; series below just drops symbols without data. */
    }
  } else {
    return NextResponse.json({ error: "Invalid range." }, { status: 400 });
  }

  const series: SeriesItem[] = entries
    .map((e) => ({
      symbol: e.symbol,
      label: e.label,
      points: pointsBySymbol[e.symbol] ?? [],
    }))
    .filter((s) => s.points.length > 1);

  return NextResponse.json({ group, range, series });
}
