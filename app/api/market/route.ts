/**
 * GET /api/market
 *
 * Read-only snapshot for the homepage market-data widgets. Batches live quotes
 * for index proxies, major ETFs, and major stocks, plus today's top gainers
 * (real screener feed), and attaches each symbol's LAST-MONTH daily price
 * history for the charts/sparklines (via the existing getHistoriesForSymbols
 * batch helper). Each section is fetched independently (allSettled) so one
 * flaky feed never sinks the others — a failed section comes back
 * { ok: false }, and missing history just yields an empty array. Nothing is
 * fabricated.
 */

import { NextResponse } from "next/server";
import {
  getHistoriesForSymbols,
  getQuotes,
  getTopGainers,
} from "@/lib/marketData/provider";
import type { PricePoint, Quote } from "@/lib/marketData/types";

// Well-known ETFs that track each major index (real, reliably-quoted proxies).
const INDEX_PROXIES: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow 30" },
  { symbol: "IWM", label: "Russell 2000" },
];
const MAJOR_ETFS = ["VOO", "QQQ", "SCHD", "VTI", "IWM", "AGG"];
const MAJOR_STOCKS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "JPM"];

const HISTORY_RANGE = "1mo" as const;

// Cache at the edge for a minute so we're not re-hitting the provider per view.
export const revalidate = 60;

interface Section<T> {
  ok: boolean;
  items: T[];
}

function settle<T>(result: PromiseSettledResult<T[]>): Section<T> {
  return result.status === "fulfilled"
    ? { ok: true, items: result.value }
    : { ok: false, items: [] };
}

export async function GET() {
  const [indexesRaw, etfsRaw, stocksRaw, gainersRaw] = await Promise.allSettled([
    getQuotes(INDEX_PROXIES.map((i) => i.symbol)),
    getQuotes(MAJOR_ETFS),
    getQuotes(MAJOR_STOCKS),
    getTopGainers(6),
  ]);

  const indexQuotes = settle<Quote>(indexesRaw);
  const etfs = settle<Quote>(etfsRaw);
  const stocks = settle<Quote>(stocksRaw);
  const gainers = settle<Quote>(gainersRaw);

  // Attach the friendly index label to each proxy quote, preserving order.
  const indexItems = INDEX_PROXIES.map(({ symbol, label }) => {
    const q = indexQuotes.items.find((item) => item.symbol === symbol);
    return q ? { ...q, label } : null;
  }).filter((x): x is Quote & { label: string } => x !== null);

  // Batch-fetch last-month history for every symbol on the page (existing
  // read-only helper). If it fails, items simply carry no history.
  const allSymbols = [
    ...indexItems.map((i) => i.symbol),
    ...etfs.items.map((q) => q.symbol),
    ...stocks.items.map((q) => q.symbol),
    ...gainers.items.map((q) => q.symbol),
  ];
  const historyBySymbol: Record<string, PricePoint[]> = {};
  try {
    const results = await getHistoriesForSymbols(allSymbols, HISTORY_RANGE);
    for (const r of results) {
      if (r.ok && !r.isCash) historyBySymbol[r.symbol] = r.points;
    }
  } catch {
    /* Leave history empty; the UI omits sparklines and keeps the quotes. */
  }

  const withHistory = <T extends { symbol: string }>(q: T) => ({
    ...q,
    history: historyBySymbol[q.symbol] ?? [],
  });

  return NextResponse.json({
    indexes: { ok: indexQuotes.ok, items: indexItems.map(withHistory) },
    etfs: { ok: etfs.ok, items: etfs.items.map(withHistory) },
    stocks: { ok: stocks.ok, items: stocks.items.map(withHistory) },
    gainers: { ok: gainers.ok, items: gainers.items.map(withHistory) },
  });
}
