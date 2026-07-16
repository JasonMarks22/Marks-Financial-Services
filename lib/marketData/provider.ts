/**
 * Market-data PROVIDER — the ONLY file in the app that talks to a specific
 * data source (currently the yahoo-finance2 library).
 *
 * ── Swapping providers later (e.g. to Financial Modeling Prep) ──────────────
 * Rewrite ONLY the insides of getQuote() and getPriceHistory() to call the new
 * source and translate its responses into the app's own types from
 * ./types.ts. Nothing else in the codebase imports yahoo-finance2 or knows
 * Yahoo exists — API routes, pages, and charts all consume the app types.
 * (An FMP version would read its key from process.env.FMP_API_KEY.)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SERVER-SIDE ONLY: these functions are called from API route handlers, never
 * from client components — the browser talks to /api/quote and /api/history.
 *
 * Error style: on any failure (unknown ticker, network trouble, empty data)
 * the functions throw a plain Error with a human-readable message the API
 * routes can pass straight through to the UI.
 */

import YahooFinance from "yahoo-finance2";
import type { HistoryRange, PriceHistory, Quote } from "./types";

// yahoo-finance2 v4 exports a class; one shared instance for all requests.
const yahooFinance = new YahooFinance();

/** Look-back window in days for each supported range. */
const RANGE_DAYS: Record<HistoryRange, number> = {
  "1mo": 31,
  "3mo": 92,
  "6mo": 183,
  "1y": 366,
  "5y": 1827,
};

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Fetch a current quote for one ticker and translate it to our Quote type. */
export async function getQuote(symbol: string): Promise<Quote> {
  let raw;
  try {
    raw = await yahooFinance.quote(symbol);
  } catch (err) {
    throw new Error(`Quote lookup failed for "${symbol}": ${errText(err)}`);
  }

  // Yahoo returns undefined/partial data for unknown tickers rather than
  // always throwing — treat missing price as "not found".
  if (!raw || raw.regularMarketPrice === undefined) {
    throw new Error(`No quote found for "${symbol}" — is the ticker valid?`);
  }

  return {
    symbol: raw.symbol ?? symbol.toUpperCase(),
    name: raw.longName ?? raw.shortName ?? raw.symbol ?? symbol.toUpperCase(),
    price: raw.regularMarketPrice,
    change: raw.regularMarketChange ?? 0,
    changePercent: raw.regularMarketChangePercent ?? 0,
    currency: raw.currency ?? "USD",
  };
}

/**
 * Fetch daily closing prices for one ticker over the given range and
 * translate them to our PriceHistory type. Uses weekly bars for the 5-year
 * range to keep the payload reasonable.
 */
export async function getPriceHistory(
  symbol: string,
  range: HistoryRange,
): Promise<PriceHistory> {
  const period1 = new Date(Date.now() - RANGE_DAYS[range] * 86_400_000);

  let raw;
  try {
    raw = await yahooFinance.chart(symbol, {
      period1,
      interval: range === "5y" ? "1wk" : "1d",
    });
  } catch (err) {
    throw new Error(`History lookup failed for "${symbol}": ${errText(err)}`);
  }

  const points = (raw?.quotes ?? [])
    .filter((q) => q.close !== null && q.close !== undefined)
    .map((q) => ({
      date: new Date(q.date).toISOString().slice(0, 10),
      close: q.close as number,
    }));

  if (points.length === 0) {
    throw new Error(
      `No price history found for "${symbol}" — is the ticker valid?`,
    );
  }

  return { symbol: symbol.toUpperCase(), points };
}
