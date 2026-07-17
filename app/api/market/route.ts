/**
 * GET /api/market
 *
 * Read-only snapshot for the homepage market-data widgets. Batches live quotes
 * for index proxies, major ETFs, and major stocks, plus today's top gainers
 * (real screener feed). Each section is fetched independently (allSettled) so
 * one flaky feed never sinks the others — a failed section comes back
 * { ok: false } and the UI shows an honest "unavailable" state rather than
 * anything fabricated.
 */

import { NextResponse } from "next/server";
import { getQuotes, getTopGainers } from "@/lib/marketData/provider";
import type { Quote } from "@/lib/marketData/types";

// Well-known ETFs that track each major index (real, reliably-quoted proxies).
const INDEX_PROXIES: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow 30" },
  { symbol: "IWM", label: "Russell 2000" },
];
const MAJOR_ETFS = ["VOO", "QQQ", "SCHD", "VTI", "IWM", "AGG"];
const MAJOR_STOCKS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "JPM"];

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
  const [indexesRaw, etfs, stocks, gainers] = await Promise.allSettled([
    getQuotes(INDEX_PROXIES.map((i) => i.symbol)),
    getQuotes(MAJOR_ETFS),
    getQuotes(MAJOR_STOCKS),
    getTopGainers(6),
  ]);

  // Attach the friendly index label to each proxy quote, preserving order.
  const indexSection = settle<Quote>(indexesRaw);
  const indexes = {
    ok: indexSection.ok,
    items: INDEX_PROXIES.map(({ symbol, label }) => {
      const q = indexSection.items.find((item) => item.symbol === symbol);
      return q ? { ...q, label } : null;
    }).filter((x): x is Quote & { label: string } => x !== null),
  };

  return NextResponse.json({
    indexes,
    etfs: settle<Quote>(etfs),
    stocks: settle<Quote>(stocks),
    gainers: settle<Quote>(gainers),
  });
}
